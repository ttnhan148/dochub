# 🏛️ DocHub System Architecture

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật, luồng dữ liệu và thiết kế các tầng của dự án **DocHub**.

---

## 1. Sơ đồ Tổng thể Hệ thống (High-Level Architecture)

```
+-------------------------------------------------------------------------------+
|                                CLIENT BROWSER                                 |
|                                                                               |
|  +--------------------------- React 18+ SPA -------------------------------+  |
|  |  Typography: Be Vietnam Pro (Google Fonts / @fontsource)                |  |
|  |  UI Framework: Tailwind CSS + shadcn/ui (Radix Primitives)               |  |
|  |                                                                         |  |
|  |  +--------------------+  +-----------------------+  +----------------+  |  |
|  |  | Sidebar / Treeview |  | Split-view Resizable  |  | Command Search |  |  |
|  |  | (Folder & Tags)    |  | Editor & Live Preview |  | (Cmdk, Ctrl+K) |  |  |
|  |  +--------------------+  +-----------+-----------+  +----------------+  |  |
|  |                                      |                                  |  |
|  |                   +------------------+------------------+               |  |
|  |                   |                                     |               |  |
|  |          [ Markdown Preview ]                  [ HTML Preview ]         |  |
|  |          - markdown-it (GFM)                   - Sandboxed <iframe>     |  |
|  |          - KaTeX (Math)                          (allow-scripts only)   |  |
|  |          - Mermaid.js (Diagrams)                                        |  |
|  |          - Prism / Highlight.js                                         |  |
|  +-------------------------------------------------------------------------+  |
+---------------------------------------+---------------------------------------+
                                        | REST API / Session Cookie
                                        v
+-------------------------------------------------------------------------------+
|                            FASTAPI BACKEND (Python)                           |
|                                                                               |
|  +-------------------+  +--------------------+  +--------------------------+  |
|  | Auth Middleware   |  | Document & Folder  |  | Search Router            |  |
|  | (Session Cookie)  |  | CRUD Routers       |  | (SQLite FTS5 queries)    |  |
|  +-------------------+  +---------+----------+  +--------------------------+  |
|                                   |                                           |
|  +-------------------+  +---------v----------+  +--------------------------+  |
|  | Asset Streamer    |  | Storage Manager    |  | AI Client (BYOK)         |  |
|  | (/api/assets/{id})|  | (storage.py)       |  | (Azure AI Foundry)       |  |
|  +-------------------+  +---------+----------+  +--------------------------+  |
|                                   |                                           |
|                                   v                                           |
|  +-------------------------------------------------------------------------+  |
|  | Backup Manager (backup.py): Background archive task -> Azure Blob       |  |
|  +-------------------------------------------------------------------------+  |
+-----------------------------------+-------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-------------------------------+
|  SQLite (dochub.db)   |                       |    LOCAL FILESYSTEM           |
|                       |                       |    (/app/data/storage/)       |
| - documents (metadata)|                       |                               |
| - folders, tags       |                       | ├── documents/<id>/current.md |
| - document_versions   |                       | ├── documents/<id>/versions/  |
| - assets (metadata)   |                       | └── assets/<doc_id>/<file>    |
| - shares              |                       +---------------+---------------+
| - ai_settings         |                                       |
| - documents_fts (FTS5)|                                       | Nén snapshot
+-----------------------+                                       v
                                                +-------------------------------+
                                                |     AZURE BLOB STORAGE        |
                                                |  (Container: dochub-backups)  |
                                                |  - dochub_YYYYMMDD.tar.gz     |
                                                |  - Giữ 30 bản gần nhất        |
                                                +-------------------------------+
```

---

## 2. Các Tầng Kiến trúc (Architectural Layers)

### 2.1 Tầng Lưu trữ (Storage Strategy)
* **Live Storage (Ổ đĩa cục bộ):**
  * Tọa lạc tại `/app/data/storage/` (gắn volume ra host qua `./data/storage/`).
  * `documents/{doc_id}/current.md` (hoặc `.html`): Lưu phiên bản sống của tài liệu.
  * `documents/{doc_id}/versions/{version_id}.md`: Lưu bản snapshot mỗi khi người dùng nhấn "Save".
  * `assets/{doc_id}/{uuid}_{filename}`: Lưu các file/ảnh đính kèm.
* **Remote Backup (Azure Blob Storage):**
  * Chỉ tương tác qua module `backend/backup.py`.
  * Tác vụ định kỳ đóng gói `dochub.db` + toàn bộ thư mục `storage/` thành `.tar.gz` và upload lên container `dochub-backups`.

### 2.2 Tầng Dữ liệu & Tìm kiếm (Data & Full-Text Search)
* **SQLite:**
  * File database: `/app/data/dochub.db`.
  * Không dùng ORM nặng; dùng raw SQL hoặc `aiosqlite` để truy vấn tốc độ cao.
* **FTS5 Indexing:**
  * Mỗi khi tài liệu được lưu, backend tự động tách nội dung plain text (loại bỏ markdown/HTML tag) và ghi vào bảng ảo `documents_fts`.
  * Truy vấn FTS5 hỗ trợ toán tử `MATCH`, xếp hạng kết quả (BM25) và trích xuất đoạn chứa từ khóa (snippet highlight).

### 2.3 Tầng Frontend & Editor
* **React + Vite + TypeScript:** Khởi động nhanh, Hot Module Replacement (HMR).
* **shadcn/ui & Radix UI:** Hệ thống component có tính tiếp cận cao (accessible), dễ tùy biến bằng Tailwind CSS.
* **Typography:** Font **Be Vietnam Pro** là font mặc định (`font-sans`), font code là `JetBrains Mono` hoặc `Fira Code`.
* **Split-View Resizable:** Sử dụng `react-resizable-panels`.
* **CodeMirror:** Nhúng qua `@uiw/react-codemirror`.
* **HTML Sandbox:** Toàn bộ HTML do user tạo được preview trong `<iframe sandbox="allow-scripts">` để triệt tiêu nguy cơ XSS đối với session của app chính.

### 2.4 Tầng Tích hợp AI (BYOK)
* Người dùng cung cấp API Key + Base URL từ Azure AI Foundry (OpenAI-compatible).
* Lưu trong bảng `ai_settings` (plain text trong môi trường cá nhân).
* Các tính năng AI:
  * Gợi ý Tags / Danh mục dựa trên phân tích văn bản (trả về JSON).
  * Dịch nội dung (Việt ⇄ Anh) và tự động tạo document mới mang hậu tố ngôn ngữ, bảo toàn cú pháp Markdown/HTML.
