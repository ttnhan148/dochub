"""
DocHub Settings Router
Quản lý cấu hình AI (BYOK - Azure AI Foundry) và kích hoạt sao lưu thủ công (Backup now).
"""

import os
from datetime import datetime
from typing import Optional
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, Field

from db import get_db
import ai
import backup
from routers.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(get_current_user)])


class AISettingsSchema(BaseModel):
    api_base_url: str
    api_key: str
    model_name: str


class AISettingsResponse(BaseModel):
    api_base_url: str
    api_key_masked: str
    has_api_key: bool
    model_name: str
    updated_at: Optional[str] = None


class TestConnectionRequest(BaseModel):
    api_base_url: str
    api_key: str
    model_name: str


def mask_key(key: str) -> str:
    """Mask key để hiển thị an toàn trên giao diện UI"""
    if not key:
        return ""
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"


@router.get("/ai", response_model=AISettingsResponse)
async def get_ai_settings(db: aiosqlite.Connection = Depends(get_db)):
    """Lấy thông tin cấu hình AI hiện tại (API Key được mask để bảo mật)"""
    async with db.execute("SELECT api_base_url, api_key, model_name, updated_at FROM ai_settings WHERE id = 1") as cursor:
        row = await cursor.fetchone()
        if not row:
            return AISettingsResponse(
                api_base_url="",
                api_key_masked="",
                has_api_key=False,
                model_name="",
                updated_at=None,
            )

        return AISettingsResponse(
            api_base_url=row["api_base_url"],
            api_key_masked=mask_key(row["api_key"]),
            has_api_key=bool(row["api_key"]),
            model_name=row["model_name"],
            updated_at=row["updated_at"],
        )


@router.put("/ai", response_model=AISettingsResponse)
async def save_ai_settings(settings_in: AISettingsSchema, db: aiosqlite.Connection = Depends(get_db)):
    """Lưu cấu hình AI BYOK vào bảng ai_settings (plain text cho single-user VM riêng)"""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Lấy key hiện tại nếu người dùng giữ nguyên mask
    current_key = ""
    async with db.execute("SELECT api_key FROM ai_settings WHERE id = 1") as cursor:
        row = await cursor.fetchone()
        if row:
            current_key = row["api_key"]

    new_key = settings_in.api_key.strip()
    # Nếu user không thay đổi key đã mask (chứa ...) thì giữ nguyên key cũ
    if "..." in new_key or new_key == "****" or not new_key:
        new_key = current_key

    await db.execute(
        """
        INSERT INTO ai_settings (id, api_base_url, api_key, model_name, updated_at)
        VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            api_base_url = excluded.api_base_url,
            api_key = excluded.api_key,
            model_name = excluded.model_name,
            updated_at = excluded.updated_at
        """,
        (settings_in.api_base_url.strip(), new_key, settings_in.model_name.strip(), now),
    )
    await db.commit()

    return AISettingsResponse(
        api_base_url=settings_in.api_base_url.strip(),
        api_key_masked=mask_key(new_key),
        has_api_key=bool(new_key),
        model_name=settings_in.model_name.strip(),
        updated_at=now,
    )


@router.post("/ai/test")
async def test_ai_settings(req: TestConnectionRequest, db: aiosqlite.Connection = Depends(get_db)):
    """Kiểm tra kết nối và verify API key/model trước khi lưu"""
    api_key = req.api_key.strip()
    if "..." in api_key or api_key == "****" or not api_key:
        # Lấy key đã lưu trong DB
        async with db.execute("SELECT api_key FROM ai_settings WHERE id = 1") as cursor:
            row = await cursor.fetchone()
            if row:
                api_key = row["api_key"]

    if not api_key:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp API Key để kiểm tra")

    res = await ai.test_ai_connection(
        api_base_url=req.api_base_url.strip(),
        api_key=api_key,
        model_name=req.model_name.strip(),
    )
    return res


@router.post("/backup/trigger")
async def trigger_manual_backup(background_tasks: BackgroundTasks):
    """Kích hoạt tác vụ sao lưu khẩn cấp (Backup now) và đẩy lên Azure Blob"""
    async def run_backup_job():
        try:
            archive_path = await backup.create_local_backup_archive()
            print(f"[+] Tạo backup archive thành công: {archive_path}")
            await backup.upload_backup_to_azure(archive_path)
        except Exception as e:
            print(f"[-] Lỗi trong quá trình backup: {e}")

    background_tasks.add_task(run_backup_job)
    return {"message": "Đã bắt đầu tiến trình sao lưu hệ thống ngầm."}
