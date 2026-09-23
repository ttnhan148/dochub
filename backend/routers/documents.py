"""
DocHub Documents Router
Quản lý CRUD tài liệu, phân phiên bản (version history), đồng bộ FTS5 và local storage.
"""

import os
import re
import uuid
from datetime import datetime
from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from db import get_db
import storage
from routers.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"], dependencies=[Depends(get_current_user)])


def strip_markup(text: str) -> str:
    """Tách bỏ các thẻ HTML và cú pháp markdown để lấy plain text phục vụ index SQLite FTS5"""
    if not text:
        return ""
    # Xóa HTML tags
    clean = re.sub(r"<[^>]+>", " ", text)
    # Xóa markdown link/image syntax [text](url) -> text
    clean = re.sub(r"!\[.*?\]\(.*?\)", " ", clean)
    clean = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", clean)
    # Xóa markdown headers, bold, italics, code fences
    clean = re.sub(r"[`#*~_>|]", " ", clean)
    # Rút gọn khoảng trắng thừa
    return re.sub(r"\s+", " ", clean).strip()


class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: str = Field("markdown", pattern="^(markdown|html)$")
    folder_id: Optional[str] = None
    content: str = ""
    tags: List[str] = []  # Danh sách tên tags


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    folder_id: Optional[str] = None
    content: Optional[str] = None
    note: Optional[str] = None  # Ghi chú khi lưu version
    tags: Optional[List[str]] = None


class TagSimple(BaseModel):
    id: str
    name: str


class DocumentSummary(BaseModel):
    id: str
    title: str
    type: str
    folder_id: Optional[str] = None
    created_at: str
    updated_at: str
    current_version_id: Optional[str] = None
    tags: List[TagSimple] = []


class DocumentDetail(DocumentSummary):
    content: str
    file_path: str


class VersionItem(BaseModel):
    id: str
    document_id: str
    file_path: str
    created_at: str
    note: Optional[str] = None


async def _sync_tags(db: aiosqlite.Connection, document_id: str, tag_names: List[str]):
    """Đồng bộ tags cho tài liệu (tự tạo tag nếu chưa có)"""
    # Xóa các liên kết tag cũ
    await db.execute("DELETE FROM document_tags WHERE document_id = ?", (document_id,))
    
    for tag_name in tag_names:
        clean_name = tag_name.strip().lower()
        if not clean_name:
            continue
        async with db.execute("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)", (clean_name,)) as cursor:
            row = await cursor.fetchone()
            if row:
                tag_id = row["id"]
            else:
                tag_id = str(uuid.uuid4())
                await db.execute("INSERT INTO tags (id, name) VALUES (?, ?)", (tag_id, clean_name))

        await db.execute(
            "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)",
            (document_id, tag_id),
        )


async def _get_document_tags(db: aiosqlite.Connection, document_id: str) -> List[TagSimple]:
    query = """
    SELECT t.id, t.name 
    FROM tags t 
    JOIN document_tags dt ON t.id = dt.tag_id 
    WHERE dt.document_id = ?
    ORDER BY t.name ASC
    """
    async with db.execute(query, (document_id,)) as cursor:
        rows = await cursor.fetchall()
        return [TagSimple(id=r["id"], name=r["name"]) for r in rows]


@router.get("", response_model=List[DocumentSummary])
async def list_documents(
    folder_id: Optional[str] = Query(None, description="Lọc theo folder (dùng 'root' để lấy tài liệu không thuộc folder nào)"),
    tag_id: Optional[str] = Query(None, description="Lọc theo tag ID"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Lấy danh sách tóm tắt các tài liệu theo bộ lọc folder hoặc tag"""
    conditions = []
    params = []

    if folder_id:
        if folder_id == "root":
            conditions.append("d.folder_id IS NULL")
        else:
            conditions.append("d.folder_id = ?")
            params.append(folder_id)

    if tag_id:
        conditions.append("EXISTS (SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id AND dt.tag_id = ?)")
        params.append(tag_id)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    query = f"""
    SELECT d.id, d.title, d.type, d.folder_id, d.created_at, d.updated_at, d.current_version_id
    FROM documents d
    {where_clause}
    ORDER BY d.updated_at DESC
    """

    async with db.execute(query, tuple(params)) as cursor:
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            tags = await _get_document_tags(db, r["id"])
            result.append(
                DocumentSummary(
                    id=r["id"],
                    title=r["title"],
                    type=r["type"],
                    folder_id=r["folder_id"],
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                    current_version_id=r["current_version_id"],
                    tags=tags,
                )
            )
        return result


@router.post("", response_model=DocumentDetail, status_code=status.HTTP_201_CREATED)
async def create_document(doc_in: DocumentCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Tạo tài liệu mới, lưu local storage, tạo version ban đầu và index FTS5"""
    doc_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Kiểm tra folder_id hợp lệ
    if doc_in.folder_id:
        async with db.execute("SELECT id FROM folders WHERE id = ?", (doc_in.folder_id,)) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Thư mục được chọn không tồn tại")

    # Lưu nội dung vào file current và snapshot version đầu tiên
    file_path = await storage.save_document_content(doc_id, doc_in.content, doc_in.type)
    version_file_path = await storage.save_version_snapshot(doc_id, version_id, doc_in.content, doc_in.type)

    # Ghi nhận vào DB
    await db.execute(
        """
        INSERT INTO documents (id, title, type, folder_id, file_path, created_at, updated_at, current_version_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (doc_id, doc_in.title.strip(), doc_in.type, doc_in.folder_id, file_path, now, now, version_id),
    )

    await db.execute(
        """
        INSERT INTO document_versions (id, document_id, file_path, created_at, note)
        VALUES (?, ?, ?, ?, ?)
        """,
        (version_id, doc_id, version_file_path, now, "Bản khởi tạo đầu tiên"),
    )

    # Đồng bộ FTS5
    plain = strip_markup(doc_in.content)
    await db.execute(
        "INSERT INTO documents_fts (document_id, title, plain_content) VALUES (?, ?, ?)",
        (doc_id, doc_in.title.strip(), plain),
    )

    # Đồng bộ Tags
    if doc_in.tags:
        await _sync_tags(db, doc_id, doc_in.tags)

    await db.commit()

    tags = await _get_document_tags(db, doc_id)
    return DocumentDetail(
        id=doc_id,
        title=doc_in.title.strip(),
        type=doc_in.type,
        folder_id=doc_in.folder_id,
        file_path=file_path,
        created_at=now,
        updated_at=now,
        current_version_id=version_id,
        tags=tags,
        content=doc_in.content,
    )


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document(document_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Lấy chi tiết tài liệu kèm nội dung văn bản từ local storage"""
    async with db.execute(
        "SELECT id, title, type, folder_id, file_path, created_at, updated_at, current_version_id FROM documents WHERE id = ?",
        (document_id,),
    ) as cursor:
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    try:
        content = await storage.read_file_content(doc["file_path"])
    except FileNotFoundError:
        content = ""

    tags = await _get_document_tags(db, document_id)

    return DocumentDetail(
        id=doc["id"],
        title=doc["title"],
        type=doc["type"],
        folder_id=doc["folder_id"],
        file_path=doc["file_path"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        current_version_id=doc["current_version_id"],
        tags=tags,
        content=content,
    )


@router.put("/{document_id}", response_model=DocumentDetail)
async def update_document(
    document_id: str,
    doc_in: DocumentUpdate,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Cập nhật nội dung tài liệu, tạo version snapshot mới và cập nhật index FTS5"""
    async with db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)) as cursor:
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    new_title = doc_in.title.strip() if doc_in.title else doc["title"]
    new_folder_id = doc_in.folder_id if doc_in.folder_id is not None else doc["folder_id"]

    if doc_in.folder_id:
        async with db.execute("SELECT id FROM folders WHERE id = ?", (doc_in.folder_id,)) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Thư mục cha không tồn tại")

    current_version_id = doc["current_version_id"]

    if doc_in.content is not None:
        # Lưu file current mới
        await storage.save_document_content(document_id, doc_in.content, doc["type"])

        # Tạo version snapshot
        new_version_id = str(uuid.uuid4())
        version_file_path = await storage.save_version_snapshot(
            document_id, new_version_id, doc_in.content, doc["type"]
        )
        version_note = doc_in.note or f"Lưu lúc {now}"

        await db.execute(
            """
            INSERT INTO document_versions (id, document_id, file_path, created_at, note)
            VALUES (?, ?, ?, ?, ?)
            """,
            (new_version_id, document_id, version_file_path, now, version_note),
        )
        current_version_id = new_version_id

        # Cập nhật FTS5: Xóa bản cũ và chèn bản mới
        plain = strip_markup(doc_in.content)
        await db.execute("DELETE FROM documents_fts WHERE document_id = ?", (document_id,))
        await db.execute(
            "INSERT INTO documents_fts (document_id, title, plain_content) VALUES (?, ?, ?)",
            (document_id, new_title, plain),
        )
    elif doc_in.title:
        # Nếu chỉ đổi tên tiêu đề, cập nhật tiêu đề trong FTS5
        async with db.execute("SELECT plain_content FROM documents_fts WHERE document_id = ?", (document_id,)) as c:
            row = await c.fetchone()
            plain = row["plain_content"] if row else ""
        await db.execute("DELETE FROM documents_fts WHERE document_id = ?", (document_id,))
        await db.execute(
            "INSERT INTO documents_fts (document_id, title, plain_content) VALUES (?, ?, ?)",
            (document_id, new_title, plain),
        )

    # Cập nhật thông tin tài liệu
    await db.execute(
        """
        UPDATE documents 
        SET title = ?, folder_id = ?, updated_at = ?, current_version_id = ?
        WHERE id = ?
        """,
        (new_title, new_folder_id, now, current_version_id, document_id),
    )

    # Đồng bộ tags nếu có
    if doc_in.tags is not None:
        await _sync_tags(db, document_id, doc_in.tags)

    await db.commit()

    content = doc_in.content if doc_in.content is not None else await storage.read_file_content(doc["file_path"])
    tags = await _get_document_tags(db, document_id)

    return DocumentDetail(
        id=document_id,
        title=new_title,
        type=doc["type"],
        folder_id=new_folder_id,
        file_path=doc["file_path"],
        created_at=doc["created_at"],
        updated_at=now,
        current_version_id=current_version_id,
        tags=tags,
        content=content,
    )


@router.delete("/{document_id}")
async def delete_document(document_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Xóa tài liệu khỏi database và xóa toàn bộ dữ liệu storage cục bộ"""
    async with db.execute("SELECT id FROM documents WHERE id = ?", (document_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Xóa khỏi database (cascade sẽ xóa versions, tags, assets, shares)
    await db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    await db.execute("DELETE FROM documents_fts WHERE document_id = ?", (document_id,))
    await db.commit()

    # Xóa thư mục storage
    storage.delete_document_storage(document_id)

    return {"message": "Đã xóa tài liệu và dữ liệu lưu trữ thành công"}


@router.get("/{document_id}/versions", response_model=List[VersionItem])
async def list_versions(document_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Lấy danh sách toàn bộ các phiên bản snapshot của tài liệu"""
    async with db.execute("SELECT id FROM documents WHERE id = ?", (document_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    query = """
    SELECT id, document_id, file_path, created_at, note
    FROM document_versions
    WHERE document_id = ?
    ORDER BY created_at DESC
    """
    async with db.execute(query, (document_id,)) as cursor:
        rows = await cursor.fetchall()
        return [
            VersionItem(
                id=r["id"],
                document_id=r["document_id"],
                file_path=r["file_path"],
                created_at=r["created_at"],
                note=r["note"],
            )
            for r in rows
        ]


@router.get("/{document_id}/versions/{version_id}")
async def get_version_content(document_id: str, version_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Lấy nội dung của một phiên bản snapshot cụ thể"""
    async with db.execute(
        "SELECT file_path FROM document_versions WHERE id = ? AND document_id = ?",
        (version_id, document_id),
    ) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bản")

    content = await storage.read_file_content(row["file_path"])
    return {"version_id": version_id, "content": content}


@router.post("/{document_id}/versions/{version_id}/restore", response_model=DocumentDetail)
async def restore_version(document_id: str, version_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Khôi phục nội dung từ phiên bản snapshot cũ (tạo version snapshot mới để bảo tồn lịch sử)"""
    async with db.execute(
        "SELECT file_path, created_at FROM document_versions WHERE id = ? AND document_id = ?",
        (version_id, document_id),
    ) as cursor:
        v_row = await cursor.fetchone()
        if not v_row:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên bản để khôi phục")

    content = await storage.read_file_content(v_row["file_path"])
    return await update_document(
        document_id=document_id,
        doc_in=DocumentUpdate(content=content, note=f"Khôi phục từ bản {v_row['created_at']}"),
        db=db,
    )
