"""
DocHub Assets Router
Quản lý tải lên, liệt kê và phân phối hình ảnh/tệp tin đính kèm an toàn.
"""

import os
import uuid
import mimetypes
from datetime import datetime
from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, Response, status
from fastapi.responses import Response as FastApiResponse
from pydantic import BaseModel

from db import get_db
import storage
from routers.auth import get_current_user, COOKIE_NAME, serializer, SESSION_MAX_AGE

router = APIRouter(prefix="/api/assets", tags=["assets"])


class AssetInfo(BaseModel):
    id: str
    document_id: str
    filename: str
    url: str
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    created_at: str


@router.post("/upload", response_model=AssetInfo, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    document_id: str = Form(...),
    file: UploadFile = File(...),
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Tải lên asset đính kèm cho tài liệu (chỉ chủ sở hữu)"""
    async with db.execute("SELECT id FROM documents WHERE id = ?", (document_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu liên kết")

    asset_id = str(uuid.uuid4())
    original_filename = file.filename or "file.bin"
    # An toàn tên file
    safe_filename = f"{asset_id[:8]}_{os.path.basename(original_filename)}"
    content_bytes = await file.read()
    size_bytes = len(content_bytes)
    mime_type = file.content_type or mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

    # Lưu vào local storage: assets/<doc_id>/<safe_filename>
    rel_path = await storage.save_asset_file(document_id, safe_filename, content_bytes)
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    await db.execute(
        """
        INSERT INTO assets (id, document_id, filename, file_path, mime_type, size_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (asset_id, document_id, original_filename, rel_path, mime_type, size_bytes, now),
    )
    await db.commit()

    return AssetInfo(
        id=asset_id,
        document_id=document_id,
        filename=original_filename,
        url=f"/api/assets/{asset_id}",
        mime_type=mime_type,
        size_bytes=size_bytes,
        created_at=now,
    )


@router.get("/document/{document_id}", response_model=List[AssetInfo])
async def list_document_assets(
    document_id: str,
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Liệt kê danh sách assets của một tài liệu"""
    query = """
    SELECT id, document_id, filename, mime_type, size_bytes, created_at
    FROM assets
    WHERE document_id = ?
    ORDER BY created_at DESC
    """
    async with db.execute(query, (document_id,)) as cursor:
        rows = await cursor.fetchall()
        return [
            AssetInfo(
                id=r["id"],
                document_id=r["document_id"],
                filename=r["filename"],
                url=f"/api/assets/{r['id']}",
                mime_type=r["mime_type"],
                size_bytes=r["size_bytes"],
                created_at=r["created_at"],
            )
            for r in rows
        ]


@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    request: Request,
    share_id: Optional[str] = Query(None),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Phục vụ tệp asset đính kèm.
    Xác thực: Cho phép chủ sở hữu đã đăng nhập HOẶC khách xem qua share link hợp lệ.
    """
    async with db.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)) as cursor:
        asset = await cursor.fetchone()
        if not asset:
            raise HTTPException(status_code=404, detail="Không tìm thấy asset")

    is_authorized = False

    # 1. Kiểm tra session cookie chủ sở hữu
    session_token = request.cookies.get(COOKIE_NAME)
    if session_token:
        try:
            data = serializer.loads(session_token, max_age=SESSION_MAX_AGE)
            if data.get("user"):
                is_authorized = True
        except Exception:
            pass

    # 2. Nếu chưa login, kiểm tra quyền qua Share Link
    if not is_authorized:
        doc_id = asset["document_id"]
        # Kiểm tra nếu có share_id truyền vào
        if share_id:
            async with db.execute(
                "SELECT * FROM shares WHERE id = ? AND document_id = ? AND revoked = 0",
                (share_id, doc_id),
            ) as c:
                share_row = await c.fetchone()
                if share_row:
                    # Kiểm tra hết hạn nếu có
                    if not share_row["expires_at"] or share_row["expires_at"] > datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"):
                        is_authorized = True
        
        # Hoặc kiểm tra xem tài liệu này có bất kỳ share link public nào đang active không cần password
        if not is_authorized:
            now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            async with db.execute(
                """
                SELECT id FROM shares 
                WHERE document_id = ? AND revoked = 0 AND password_hash IS NULL 
                  AND (expires_at IS NULL OR expires_at > ?)
                LIMIT 1
                """,
                (doc_id, now_str),
            ) as c:
                if await c.fetchone():
                    is_authorized = True

        # Hoặc kiểm tra cookie truy cập share đã unlock password: dochub_share_{doc_id}
        if not is_authorized:
            share_cookie = request.cookies.get(f"dochub_share_{doc_id}")
            if share_cookie == "granted":
                is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập tệp tin này",
        )

    try:
        content_bytes = await storage.read_asset_bytes(asset["file_path"])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tệp tin không tồn tại trên ổ đĩa")

    mime = asset["mime_type"] or "application/octet-stream"
    headers = {
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": f'inline; filename="{asset["filename"]}"',
    }

    return FastApiResponse(content=content_bytes, media_type=mime, headers=headers)


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    user: str = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Xóa asset khỏi database và local storage"""
    async with db.execute("SELECT file_path FROM assets WHERE id = ?", (asset_id,)) as cursor:
        asset = await cursor.fetchone()
        if not asset:
            raise HTTPException(status_code=404, detail="Không tìm thấy asset")

    await db.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
    await db.commit()

    storage.delete_asset_file(asset["file_path"])
    return {"message": "Đã xóa asset thành công"}
