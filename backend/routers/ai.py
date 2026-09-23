"""
DocHub AI Router
Các endpoint kích hoạt tính năng AI: gợi ý tags và dịch tài liệu tự động.
"""

from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from db import get_db
import storage
import ai
from routers.auth import get_current_user
from routers.documents import create_document, DocumentCreate, DocumentDetail

router = APIRouter(prefix="/api/ai", tags=["ai"], dependencies=[Depends(get_current_user)])


class SuggestTagsRequest(BaseModel):
    document_id: str


class SuggestTagsResponse(BaseModel):
    tags: List[str]


class TranslateRequest(BaseModel):
    document_id: str
    target_lang: str = "English"  # "English" hoặc "Vietnamese"


async def _get_active_ai_settings(db: aiosqlite.Connection):
    async with db.execute("SELECT api_base_url, api_key, model_name FROM ai_settings WHERE id = 1") as cursor:
        row = await cursor.fetchone()
        if not row or not row["api_key"] or not row["api_base_url"]:
            raise HTTPException(
                status_code=400,
                detail="Chưa cấu hình API Key / Base URL trong phần Cài đặt AI (Settings).",
            )
        return row["api_base_url"], row["api_key"], row["model_name"]


@router.post("/suggest-tags", response_model=SuggestTagsResponse)
async def suggest_document_tags(req: SuggestTagsRequest, db: aiosqlite.Connection = Depends(get_db)):
    """Gợi ý danh sách tag phù hợp cho tài liệu thông qua AI"""
    base_url, key, model = await _get_active_ai_settings(db)

    async with db.execute("SELECT title, file_path FROM documents WHERE id = ?", (req.document_id,)) as cursor:
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    try:
        content = await storage.read_file_content(doc["file_path"])
    except Exception:
        content = ""

    tags = await ai.suggest_tags_and_category(
        api_base_url=base_url,
        api_key=key,
        model_name=model,
        title=doc["title"],
        content_sample=content,
    )
    return SuggestTagsResponse(tags=tags)


@router.post("/translate", response_model=DocumentDetail)
async def translate_document(req: TranslateRequest, db: aiosqlite.Connection = Depends(get_db)):
    """Dịch tài liệu và tạo một bản sao mới (bảo tồn nguyên vẹn bản gốc)"""
    base_url, key, model = await _get_active_ai_settings(db)

    async with db.execute("SELECT * FROM documents WHERE id = ?", (req.document_id,)) as cursor:
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu gốc")

    content = await storage.read_file_content(doc["file_path"])

    try:
        translated_text = await ai.translate_content(
            api_base_url=base_url,
            api_key=key,
            model_name=model,
            content=content,
            target_lang=req.target_lang,
            doc_type=doc["type"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quá trình dịch AI thất bại: {str(e)}")

    # Lấy danh sách tag hiện tại của tài liệu gốc
    async with db.execute(
        "SELECT t.name FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
        (req.document_id,),
    ) as c:
        tag_rows = await c.fetchall()
        tags = [r["name"] for r in tag_rows]

    # Gắn thêm tag "translated"
    if "translated" not in tags:
        tags.append("translated")

    lang_suffix = "EN" if "eng" in req.target_lang.lower() else "VI"
    new_title = f"{doc['title']} ({lang_suffix})"

    # Tạo document mới độc lập
    new_doc = await create_document(
        doc_in=DocumentCreate(
            title=new_title,
            type=doc["type"],
            folder_id=doc["folder_id"],
            content=translated_text,
            tags=tags,
        ),
        db=db,
    )
    return new_doc
