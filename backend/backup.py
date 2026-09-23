"""
DocHub Backup Module
Đóng gói dochub.db + storage/ thành tar.gz và upload lên Azure Blob Storage (dochub-backups)
Áp dụng SQLite backup API an toàn và retention policy (giữ 30 bản gần nhất).
"""

import os
import tarfile
import sqlite3
import asyncio
from datetime import datetime
from typing import Optional

BACKUP_STAGING_PATH = os.getenv("BACKUP_STAGING_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "backups")))
DB_PATH = os.getenv("DB_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "dochub.db")))
STORAGE_PATH = os.getenv("STORAGE_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "storage")))
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_STORAGE_BACKUP_CONTAINER = os.getenv("AZURE_STORAGE_BACKUP_CONTAINER", "dochub-backups")
MAX_BACKUP_RETENTION = 30


def _create_db_snapshot(snapshot_path: str):
    """
    Sử dụng SQLite Online Backup API để tạo snapshot nhất quán mà không lo database bị khóa
    hoặc hỏng dữ liệu do WAL log chưa checkpoint.
    """
    if not os.path.exists(DB_PATH):
        return
    src = sqlite3.connect(DB_PATH)
    dst = sqlite3.connect(snapshot_path)
    try:
        src.backup(dst)
    finally:
        src.close()
        dst.close()


def _cleanup_local_backups(keep: int = MAX_BACKUP_RETENTION):
    """Dọn dẹp các tệp backup cũ trong thư mục staging cục bộ"""
    if not os.path.exists(BACKUP_STAGING_PATH):
        return
    files = [
        os.path.join(BACKUP_STAGING_PATH, f)
        for f in os.listdir(BACKUP_STAGING_PATH)
        if f.startswith("dochub_") and f.endswith(".tar.gz")
    ]
    files.sort(key=os.path.getmtime, reverse=True)
    for old_file in files[keep:]:
        try:
            os.remove(old_file)
        except OSError:
            pass


def _cleanup_azure_backups(container_client, keep: int = MAX_BACKUP_RETENTION):
    """Giữ 30 bản sao lưu gần nhất trên Azure Blob Storage"""
    try:
        blobs = list(container_client.list_blobs(name_starts_with="dochub_"))
        blobs.sort(key=lambda b: b.creation_time or b.last_modified, reverse=True)
        for old_blob in blobs[keep:]:
            container_client.delete_blob(old_blob.name)
            print(f"[+] Dọn dẹp backup cũ trên Azure Blob: {old_blob.name}")
    except Exception as e:
        print(f"[-] Lỗi khi dọn dẹp backup Azure Blob cũ: {e}")


def _sync_create_backup_archive() -> str:
    """Tạo tệp archive tar.gz an toàn và dọn dẹp local retention"""
    os.makedirs(BACKUP_STAGING_PATH, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_db_path = os.path.join(BACKUP_STAGING_PATH, f"snapshot_{timestamp}.db")
    archive_filename = f"dochub_{timestamp}.tar.gz"
    archive_path = os.path.join(BACKUP_STAGING_PATH, archive_filename)

    try:
        _create_db_snapshot(snapshot_db_path)

        with tarfile.open(archive_path, "w:gz") as tar:
            if os.path.exists(snapshot_db_path):
                tar.add(snapshot_db_path, arcname="dochub.db")
            if os.path.exists(STORAGE_PATH):
                tar.add(STORAGE_PATH, arcname="storage")
    finally:
        # Xóa snapshot tạm thời sau khi đã nén vào tar.gz
        if os.path.exists(snapshot_db_path):
            try:
                os.remove(snapshot_db_path)
            except OSError:
                pass

    _cleanup_local_backups(MAX_BACKUP_RETENTION)
    return archive_path


async def create_local_backup_archive() -> str:
    """Hàm bất đồng bộ gọi quá trình đóng gói backup qua thread pool"""
    return await asyncio.to_thread(_sync_create_backup_archive)


def _sync_upload_backup_to_azure(archive_path: str):
    """Tác vụ upload đồng bộ chạy trong thread pool"""
    if not AZURE_STORAGE_CONNECTION_STRING:
        print("[!] Không tìm thấy AZURE_STORAGE_CONNECTION_STRING. Bỏ qua upload cloud backup.")
        return

    try:
        from azure.storage.blob import BlobServiceClient

        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        container_client = blob_service_client.get_container_client(AZURE_STORAGE_BACKUP_CONTAINER)
        
        if not container_client.exists():
            container_client.create_container()

        blob_name = os.path.basename(archive_path)
        with open(archive_path, "rb") as data:
            container_client.upload_blob(name=blob_name, data=data, overwrite=True)

        print(f"[+] Đã upload backup thành công lên Azure Blob: {blob_name}")
        _cleanup_azure_backups(container_client, MAX_BACKUP_RETENTION)
    except Exception as e:
        print(f"[-] Lỗi khi upload backup lên Azure Blob: {e}")


async def upload_backup_to_azure(archive_path: str):
    """Upload tệp archive lên Azure Blob Storage (chạy trong non-blocking worker thread)"""
    await asyncio.to_thread(_sync_upload_backup_to_azure, archive_path)
