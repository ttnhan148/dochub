"""
DocHub Local File Storage Module
Quản lý đọc/ghi tệp tin markdown, html, version snapshots và assets tại /app/data/storage/
"""

import os
import shutil
import aiofiles

STORAGE_PATH = os.getenv("STORAGE_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "storage")))


def _resolve_safe_path(relative_path: str) -> str:
    """
    Chuẩn hóa và kiểm tra đường dẫn để ngăn chặn lỗ hổng Path Traversal.
    Đảm bảo đường dẫn tuyệt đối bắt buộc phải nằm bên trong STORAGE_PATH.
    """
    storage_abs = os.path.abspath(STORAGE_PATH)
    target_abs = os.path.abspath(os.path.join(storage_abs, relative_path))
    if not (target_abs == storage_abs or target_abs.startswith(storage_abs + os.sep)):
        raise PermissionError(f"Access denied: Path '{relative_path}' is outside storage root")
    return target_abs


def get_document_dir(document_id: str) -> str:
    path = _resolve_safe_path(os.path.join("documents", document_id))
    os.makedirs(path, exist_ok=True)
    return path


def get_version_dir(document_id: str) -> str:
    path = _resolve_safe_path(os.path.join("documents", document_id, "versions"))
    os.makedirs(path, exist_ok=True)
    return path


def get_asset_dir(document_id: str) -> str:
    path = _resolve_safe_path(os.path.join("assets", document_id))
    os.makedirs(path, exist_ok=True)
    return path


async def save_document_content(document_id: str, content: str, doc_type: str = "markdown") -> str:
    """Lưu nội dung document hiện tại vào local storage"""
    get_document_dir(document_id)
    ext = ".md" if doc_type == "markdown" else ".html"
    relative_path = os.path.join("documents", document_id, f"current{ext}")
    full_path = _resolve_safe_path(relative_path)
    
    async with aiofiles.open(full_path, "w", encoding="utf-8") as f:
        await f.write(content)
        
    return relative_path.replace("\\", "/")


async def save_version_snapshot(document_id: str, version_id: str, content: str, doc_type: str = "markdown") -> str:
    """Lưu snapshot lịch sử phiên bản vào local storage"""
    get_version_dir(document_id)
    ext = ".md" if doc_type == "markdown" else ".html"
    relative_path = os.path.join("documents", document_id, "versions", f"{version_id}{ext}")
    full_path = _resolve_safe_path(relative_path)
    
    async with aiofiles.open(full_path, "w", encoding="utf-8") as f:
        await f.write(content)
        
    return relative_path.replace("\\", "/")


async def read_file_content(relative_path: str) -> str:
    """Đọc nội dung văn bản từ local storage an toàn chống path traversal"""
    full_path = _resolve_safe_path(relative_path)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"File not found: {relative_path}")
        
    async with aiofiles.open(full_path, "r", encoding="utf-8") as f:
        return await f.read()


async def save_asset_file(document_id: str, filename: str, content: bytes) -> str:
    """Lưu tệp asset nhị phân (ảnh, tài liệu đính kèm) vào local storage"""
    get_asset_dir(document_id)
    relative_path = os.path.join("assets", document_id, filename)
    full_path = _resolve_safe_path(relative_path)

    async with aiofiles.open(full_path, "wb") as f:
        await f.write(content)

    return relative_path.replace("\\", "/")


async def read_asset_bytes(relative_path: str) -> bytes:
    """Đọc tệp asset nhị phân từ local storage"""
    full_path = _resolve_safe_path(relative_path)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"Asset file not found: {relative_path}")

    async with aiofiles.open(full_path, "rb") as f:
        return await f.read()


def delete_document_storage(document_id: str):
    """Xóa toàn bộ thư mục dữ liệu và assets của tài liệu"""
    doc_dir = os.path.join(STORAGE_PATH, "documents", document_id)
    asset_dir = os.path.join(STORAGE_PATH, "assets", document_id)
    
    if os.path.exists(doc_dir):
        shutil.rmtree(doc_dir, ignore_errors=True)
    if os.path.exists(asset_dir):
        shutil.rmtree(asset_dir, ignore_errors=True)


def delete_asset_file(relative_path: str):
    """Xóa một tệp asset cụ thể"""
    full_path = _resolve_safe_path(relative_path)
    if os.path.exists(full_path):
        os.remove(full_path)
