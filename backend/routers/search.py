"""
DocHub Search Router
Tìm kiếm toàn văn bản (Full-Text Search) siêu tốc với SQLite FTS5 và snippet highlighting.
"""

import re
from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from db import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"], dependencies=[Depends(get_current_user)])


class SearchResultItem(BaseModel):
    document_id: str
    title: str
    snippet: str
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    tags: List[str] = []
    updated_at: str


def sanitize_fts_query(query: str) -> str:
    """
    Làm sạch query để tránh lỗi cú pháp FTS5 khi người dùng nhập ký tự đặc biệt,
    hỗ trợ tìm kiếm từ khóa linh hoạt bằng toán tử NEAR/OR.
    """
    clean = re.sub(r'[^\w\s]', ' ', query).strip()
    words = clean.split()
    if not words:
        return ""
    # Chuyển thành chuỗi tìm kiếm tiền tố hoặc cụm từ: "từ1"* "từ2"*
    terms = [f'"{w}"*' for w in words]
    return " ".join(terms)


@router.get("", response_model=List[SearchResultItem])
async def search_documents(
    q: str = Query(..., min_length=1, description="Từ khóa tìm kiếm"),
    limit: int = Query(20, ge=1, le=100),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Tìm kiếm tài liệu bằng tiêu đề hoặc nội dung qua bảng ảo documents_fts"""
    fts_query = sanitize_fts_query(q)
    if not fts_query:
        return []

    # SQLite FTS5 query với hàm snippet trích xuất đoạn văn chứa từ khóa
    # Column 0: document_id, 1: title, 2: plain_content
    sql = """
    SELECT 
        fts.document_id,
        fts.title,
        snippet(documents_fts, 2, '<mark class="bg-yellow-200 dark:bg-yellow-900/60 font-semibold px-0.5 rounded">', '</mark>', '...', 24) AS snippet,
        d.folder_id,
        f.name AS folder_name,
        d.updated_at
    FROM documents_fts fts
    JOIN documents d ON fts.document_id = d.id
    LEFT JOIN folders f ON d.folder_id = f.id
    WHERE documents_fts MATCH ?
    ORDER BY rank
    LIMIT ?
    """

    try:
        async with db.execute(sql, (fts_query, limit)) as cursor:
            rows = await cursor.fetchall()
            results = []
            for r in rows:
                # Lấy danh sách tag names
                async with db.execute(
                    "SELECT t.name FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
                    (r["document_id"],),
                ) as c:
                    tag_rows = await c.fetchall()
                    tags = [tr["name"] for tr in tag_rows]

                results.append(
                    SearchResultItem(
                        document_id=r["document_id"],
                        title=r["title"],
                        snippet=r["snippet"] or "",
                        folder_id=r["folder_id"],
                        folder_name=r["folder_name"],
                        tags=tags,
                        updated_at=r["updated_at"],
                    )
                )
            return results
    except Exception as e:
        # Fallback tìm kiếm đơn giản LIKE nếu FTS MATCH có lỗi cú pháp bất ngờ
        fallback_sql = """
        SELECT d.id AS document_id, d.title, d.folder_id, f.name AS folder_name, d.updated_at
        FROM documents d
        LEFT JOIN folders f ON d.folder_id = f.id
        WHERE d.title LIKE ?
        ORDER BY d.updated_at DESC
        LIMIT ?
        """
        async with db.execute(fallback_sql, (f"%{q}%", limit)) as cursor:
            rows = await cursor.fetchall()
            return [
                SearchResultItem(
                    document_id=r["document_id"],
                    title=r["title"],
                    snippet=r["title"],
                    folder_id=r["folder_id"],
                    folder_name=r["folder_name"],
                    tags=[],
                    updated_at=r["updated_at"],
                )
                for r in rows
            ]
