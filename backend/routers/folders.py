"""
DocHub Folders Router
Quản lý cây thư mục phân cấp, ngăn chặn xóa khi còn dữ liệu (RESTRICT).
"""

import uuid
from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from db import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/folders", tags=["folders"], dependencies=[Depends(get_current_user)])


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[str] = None


class FolderItem(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    created_at: Optional[str] = None


@router.get("", response_model=List[FolderItem])
async def list_folders(db: aiosqlite.Connection = Depends(get_db)):
    """Lấy danh sách tất cả các thư mục"""
    async with db.execute("SELECT id, name, parent_id, created_at FROM folders ORDER BY name ASC") as cursor:
        rows = await cursor.fetchall()
        return [
            FolderItem(
                id=row["id"],
                name=row["name"],
                parent_id=row["parent_id"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@router.post("", response_model=FolderItem, status_code=status.HTTP_201_CREATED)
async def create_folder(folder_in: FolderCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Tạo thư mục mới"""
    if folder_in.parent_id:
        async with db.execute("SELECT id FROM folders WHERE id = ?", (folder_in.parent_id,)) as cursor:
            parent = await cursor.fetchone()
            if not parent:
                raise HTTPException(status_code=400, detail="Thư mục cha không tồn tại")

    folder_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)",
        (folder_id, folder_in.name.strip(), folder_in.parent_id),
    )
    await db.commit()

    async with db.execute("SELECT id, name, parent_id, created_at FROM folders WHERE id = ?", (folder_id,)) as cursor:
        row = await cursor.fetchone()
        return FolderItem(
            id=row["id"],
            name=row["name"],
            parent_id=row["parent_id"],
            created_at=row["created_at"],
        )


@router.put("/{folder_id}", response_model=FolderItem)
async def update_folder(folder_id: str, folder_in: FolderUpdate, db: aiosqlite.Connection = Depends(get_db)):
    """Cập nhật tên hoặc di chuyển thư mục cha"""
    async with db.execute("SELECT id, name, parent_id, created_at FROM folders WHERE id = ?", (folder_id,)) as cursor:
        folder = await cursor.fetchone()
        if not folder:
            raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")

    # Kiểm tra tránh vòng lặp thư mục (circular reference)
    if folder_in.parent_id is not None:
        if folder_in.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="Không thể đặt thư mục cha là chính nó")
        
        # Duyệt cây cha để đảm bảo parent_id mới không phải là con cháu của folder_id
        current_check = folder_in.parent_id
        while current_check:
            async with db.execute("SELECT parent_id FROM folders WHERE id = ?", (current_check,)) as c:
                parent_row = await c.fetchone()
                if not parent_row:
                    raise HTTPException(status_code=400, detail="Thư mục cha được chọn không tồn tại")
                if parent_row["parent_id"] == folder_id:
                    raise HTTPException(status_code=400, detail="Không thể di chuyển thư mục vào bên trong thư mục con của nó")
                current_check = parent_row["parent_id"]

    new_name = folder_in.name.strip() if folder_in.name else folder["name"]
    new_parent_id = folder_in.parent_id if folder_in.parent_id is not None else folder["parent_id"]

    await db.execute(
        "UPDATE folders SET name = ?, parent_id = ? WHERE id = ?",
        (new_name, new_parent_id, folder_id),
    )
    await db.commit()

    return FolderItem(
        id=folder_id,
        name=new_name,
        parent_id=new_parent_id,
        created_at=folder["created_at"],
    )


@router.delete("/{folder_id}")
async def delete_folder(folder_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Xóa thư mục (Chặn xóa nếu có thư mục con hoặc tài liệu bên trong)"""
    async with db.execute("SELECT id FROM folders WHERE id = ?", (folder_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")

    # Kiểm tra tài liệu bên trong
    async with db.execute("SELECT COUNT(*) as count FROM documents WHERE folder_id = ?", (folder_id,)) as cursor:
        doc_count = (await cursor.fetchone())["count"]
        if doc_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xóa thư mục vì còn {doc_count} tài liệu bên trong. Hãy di chuyển hoặc xóa tài liệu trước.",
            )

    # Kiểm tra thư mục con bên trong
    async with db.execute("SELECT COUNT(*) as count FROM folders WHERE parent_id = ?", (folder_id,)) as cursor:
        child_count = (await cursor.fetchone())["count"]
        if child_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xóa thư mục vì còn {child_count} thư mục con bên trong. Hãy di chuyển hoặc xóa thư mục con trước.",
            )

    await db.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
    await db.commit()
    return {"message": "Đã xóa thư mục thành công"}
