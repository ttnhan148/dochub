"""
DocHub Tags Router
Quản lý nhãn (tags) và liên kết tài liệu.
"""

import uuid
from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from db import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/tags", tags=["tags"], dependencies=[Depends(get_current_user)])


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class TagItem(BaseModel):
    id: str
    name: str
    doc_count: int = 0


@router.get("", response_model=List[TagItem])
async def list_tags(db: aiosqlite.Connection = Depends(get_db)):
    """Lấy danh sách tất cả các tag cùng số lượng tài liệu liên kết"""
    query = """
    SELECT t.id, t.name, COUNT(dt.document_id) as doc_count
    FROM tags t
    LEFT JOIN document_tags dt ON t.id = dt.tag_id
    GROUP BY t.id, t.name
    ORDER BY t.name ASC
    """
    async with db.execute(query) as cursor:
        rows = await cursor.fetchall()
        return [
            TagItem(id=row["id"], name=row["name"], doc_count=row["doc_count"])
            for row in rows
        ]


@router.post("", response_model=TagItem, status_code=status.HTTP_201_CREATED)
async def create_tag(tag_in: TagCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Tạo tag mới (hoặc trả về tag hiện có nếu trùng tên)"""
    name_clean = tag_in.name.strip().lower()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Tên tag không được để trống")

    async with db.execute("SELECT id, name FROM tags WHERE LOWER(name) = LOWER(?)", (name_clean,)) as cursor:
        row = await cursor.fetchone()
        if row:
            # Tag đã tồn tại
            async with db.execute("SELECT COUNT(*) as count FROM document_tags WHERE tag_id = ?", (row["id"],)) as c:
                count = (await c.fetchone())["count"]
            return TagItem(id=row["id"], name=row["name"], doc_count=count)

    tag_id = str(uuid.uuid4())
    await db.execute("INSERT INTO tags (id, name) VALUES (?, ?)", (tag_id, name_clean))
    await db.commit()

    return TagItem(id=tag_id, name=name_clean, doc_count=0)


@router.delete("/{tag_id}")
async def delete_tag(tag_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Xóa một tag (tự động xóa trong document_tags theo cascade)"""
    async with db.execute("SELECT id FROM tags WHERE id = ?", (tag_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tag")

    await db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    await db.commit()
    return {"message": "Đã xóa tag thành công"}
