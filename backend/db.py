"""
DocHub Database Module
SQLite3 + FTS5 full-text search initialization and async connection helper.
"""

import os
from typing import AsyncGenerator
import aiosqlite

DB_PATH = os.getenv("DB_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "dochub.db")))

SCHEMA_SQL = """
-- Folders tree table
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE RESTRICT
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('markdown', 'html')),
    folder_id TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_version_id TEXT, -- soft reference to document_versions(id)
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

-- Document versions history
CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Document <-> Tags association
CREATE TABLE IF NOT EXISTS document_tags (
    document_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (document_id, tag_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Shares table
CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    password_hash TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT 0,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- AI Settings table (single-row)
CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    api_base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_name TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SQLite FTS5 Full-Text Search Virtual Table
-- remove_diacritics 0: Giữ nguyên dấu tiếng Việt để tìm kiếm chính xác
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    document_id UNINDEXED,
    title,
    plain_content,
    tokenize='unicode61 remove_diacritics 0'
);
"""


async def get_db_connection() -> aiosqlite.Connection:
    """Tạo kết nối SQLite async kèm cấu hình WAL, busy_timeout và foreign keys"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode = WAL;")
    await db.execute("PRAGMA busy_timeout = 5000;")
    await db.execute("PRAGMA foreign_keys = ON;")
    return db


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """FastAPI Depends generator để quản lý vòng đời kết nối db"""
    db = await get_db_connection()
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    """Khởi tạo toàn bộ bảng SQLite và FTS5 ảo nếu chưa tồn tại"""
    async with await get_db_connection() as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
