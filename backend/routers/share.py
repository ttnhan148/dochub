"""
DocHub Share Router
Quản lý chia sẻ tài liệu công khai (/s/{share_id}) kèm mật khẩu và hạn sử dụng.
"""

import uuid
import bcrypt
from datetime import datetime
from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from db import get_db
import storage
from routers.auth import get_current_user

router = APIRouter(prefix="/api/share", tags=["share"])


class ShareCreate(BaseModel):
    document_id: str
    password: Optional[str] = None
    expires_at: Optional[str] = None  # Format: YYYY-MM-DD HH:MM:SS


class ShareItem(BaseModel):
    id: str
    document_id: str
    has_password: bool
    expires_at: Optional[str] = None
    created_at: str
    revoked: bool
    share_url: str


class PublicShareResponse(BaseModel):
    share_id: str
    document_id: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    content: Optional[str] = None
    requires_password: bool = False
    updated_at: Optional[str] = None


class UnlockRequest(BaseModel):
    password: str


# --- Quản trị viên (Chủ sở hữu) Endpoints ---

@router.post("", response_model=ShareItem, status_code=status.HTTP_201_CREATED)
async def create_share(
    share_in: ShareCreate,
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Tạo liên kết chia sẻ mới cho tài liệu"""
    async with db.execute("SELECT id FROM documents WHERE id = ?", (share_in.document_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    share_id = str(uuid.uuid4())
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    password_hash = None
    if share_in.password and share_in.password.strip():
        salt = bcrypt.gensalt(rounds=10)
        password_hash = bcrypt.hashpw(share_in.password.strip().encode("utf-8"), salt).decode("utf-8")

    await db.execute(
        """
        INSERT INTO shares (id, document_id, password_hash, expires_at, created_at, revoked)
        VALUES (?, ?, ?, ?, ?, 0)
        """,
        (share_id, share_in.document_id, password_hash, share_in.expires_at, now),
    )
    await db.commit()

    return ShareItem(
        id=share_id,
        document_id=share_in.document_id,
        has_password=password_hash is not None,
        expires_at=share_in.expires_at,
        created_at=now,
        revoked=False,
        share_url=f"/s/{share_id}",
    )


@router.get("/document/{document_id}", response_model=List[ShareItem])
async def list_document_shares(
    document_id: str,
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Lấy danh sách các liên kết chia sẻ của một tài liệu"""
    query = """
    SELECT id, document_id, password_hash, expires_at, created_at, revoked
    FROM shares
    WHERE document_id = ?
    ORDER BY created_at DESC
    """
    async with db.execute(query, (document_id,)) as cursor:
        rows = await cursor.fetchall()
        return [
            ShareItem(
                id=r["id"],
                document_id=r["document_id"],
                has_password=r["password_hash"] is not None,
                expires_at=r["expires_at"],
                created_at=r["created_at"],
                revoked=bool(r["revoked"]),
                share_url=f"/s/{r['id']}",
            )
            for r in rows
        ]


@router.post("/{share_id}/revoke")
async def revoke_share(
    share_id: str,
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Thu hồi liên kết chia sẻ ngay lập tức"""
    async with db.execute("SELECT id FROM shares WHERE id = ?", (share_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy liên kết chia sẻ")

    await db.execute("UPDATE shares SET revoked = 1 WHERE id = ?", (share_id,))
    await db.commit()
    return {"message": "Đã thu hồi liên kết chia sẻ thành công"}


@router.delete("/{share_id}")
async def delete_share(
    share_id: str,
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Xóa hẳn liên kết chia sẻ khỏi hệ thống"""
    async with db.execute("SELECT id FROM shares WHERE id = ?", (share_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy liên kết chia sẻ")

    await db.execute("DELETE FROM shares WHERE id = ?", (share_id,))
    await db.commit()
    return {"message": "Đã xóa liên kết chia sẻ"}


# --- Khách xem công khai (Public Viewers) Endpoints ---

@router.get("/public/{share_id}", response_model=PublicShareResponse)
async def get_public_share(
    share_id: str,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Lấy nội dung tài liệu công khai phục vụ trang Read-only cho khách hàng"""
    sql = """
    SELECT s.id AS share_id, s.document_id, s.password_hash, s.expires_at, s.revoked,
           d.title, d.type, d.file_path, d.updated_at
    FROM shares s
    JOIN documents d ON s.document_id = d.id
    WHERE s.id = ?
    """
    async with db.execute(sql, (share_id,)) as cursor:
        share = await cursor.fetchone()
        if not share or share["revoked"]:
            raise HTTPException(status_code=404, detail="Liên kết chia sẻ không tồn tại hoặc đã bị thu hồi")

    # Kiểm tra hạn sử dụng
    if share["expires_at"]:
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        if share["expires_at"] < now_str:
            raise HTTPException(status_code=410, detail="Liên kết chia sẻ này đã hết hạn")

    # Kiểm tra mật khẩu bảo vệ
    if share["password_hash"]:
        cookie_unlocked = request.cookies.get(f"dochub_share_{share['document_id']}")
        if cookie_unlocked != "granted":
            # Yêu cầu nhập mật khẩu
            return PublicShareResponse(
                share_id=share_id,
                requires_password=True,
                title="Tài liệu được bảo vệ",
            )

    # Đọc nội dung tệp tin từ local storage
    try:
        content = await storage.read_file_content(share["file_path"])
    except FileNotFoundError:
        content = "*(Nội dung tài liệu không khả dụng)*"

    return PublicShareResponse(
        share_id=share_id,
        document_id=share["document_id"],
        title=share["title"],
        type=share["type"],
        content=content,
        requires_password=False,
        updated_at=share["updated_at"],
    )


@router.post("/public/{share_id}/unlock")
async def unlock_public_share(
    share_id: str,
    req: UnlockRequest,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Mở khóa liên kết chia sẻ có mật khẩu"""
    async with db.execute("SELECT document_id, password_hash, revoked, expires_at FROM shares WHERE id = ?", (share_id,)) as cursor:
        share = await cursor.fetchone()
        if not share or share["revoked"]:
            raise HTTPException(status_code=404, detail="Liên kết chia sẻ không tồn tại hoặc đã bị thu hồi")

    if not share["password_hash"]:
        return {"success": True, "message": "Liên kết không yêu cầu mật khẩu"}

    try:
        matched = bcrypt.checkpw(req.password.encode("utf-8"), share["password_hash"].encode("utf-8"))
    except Exception:
        matched = False

    if not matched:
        raise HTTPException(status_code=401, detail="Mật khẩu truy cập không chính xác")

    # Đặt cookie mở khóa tạm thời cho tài liệu trong 24 giờ
    response.set_cookie(
        key=f"dochub_share_{share['document_id']}",
        value="granted",
        max_age=24 * 3600,
        httponly=True,
        samesite="lax",
    )
    return {"success": True, "message": "Mở khóa thành công"}
