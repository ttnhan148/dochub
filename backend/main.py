"""
DocHub - Main FastAPI Application Entrypoint
Khởi tạo database SQLite, FTS5, scheduler sao lưu định kỳ và đăng ký các REST API router.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from db import init_db
import backup
from routers import auth, documents, folders, tags, search, assets, share, ai, settings

scheduler = AsyncIOScheduler()


async def scheduled_backup_job():
    """Tác vụ tự động sao lưu hàng ngày đẩy lên Azure Blob Storage"""
    try:
        print("[*] Bắt đầu tác vụ sao lưu hệ thống tự động theo lịch...")
        archive_path = await backup.create_local_backup_archive()
        print(f"[+] Tạo tệp nén backup thành công: {archive_path}")
        await backup.upload_backup_to_azure(archive_path)
    except Exception as e:
        print(f"[-] Lỗi trong tiến trình sao lưu tự động: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo SQLite schema và FTS5 table khi startup
    await init_db()

    # Kích hoạt Scheduler sao lưu hàng ngày lúc 02:00 sáng
    try:
        scheduler.add_job(scheduled_backup_job, "cron", hour=2, minute=0, id="daily_backup")
        scheduler.start()
        print("[+] Scheduler sao lưu hàng ngày đã kích hoạt thành công.")
    except Exception as e:
        print(f"[-] Không thể khởi động Scheduler sao lưu: {e}")

    yield

    # Tắt scheduler khi shutdown
    try:
        scheduler.shutdown(wait=False)
    except Exception:
        pass


app = FastAPI(
    title="DocHub API",
    description="Knowledge Base & Presentation Tool Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration: cho phép localhost dev và domain production
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các API Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(folders.router)
app.include_router(tags.router)
app.include_router(search.router)
app.include_router(assets.router)
app.include_router(share.router)
app.include_router(ai.router)
app.include_router(settings.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "DocHub"}


# Phục vụ static bundle của React khi ở production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
