<div align="center">

# 📑 DocHub

**Lightweight, Zero-Bloat Markdown & HTML Knowledge Base and Client Presentation Tool.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite FTS5](https://img.shields.io/badge/SQLite-FTS5_Full--Text-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/fts5.html)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/ttnhan148/dochub/pulls)

<p align="center">
  <a href="#-tổng-quan--triết-lý-thiết-kế">Tổng quan</a> •
  <a href="#-tính-năng-cốt-lõi">Tính năng</a> •
  <a href="#-kiến-trúc-hệ-thống">Kiến trúc</a> •
  <a href="#-khởi-chạy-nhanh-quick-start">Khởi chạy nhanh</a> •
  <a href="#-cấu-hình-biến-môi-trường">Cấu hình</a> •
  <a href="#-bảo-mật">Bảo mật</a> •
  <a href="#-hệ-thống-quản-trị-đa-agent">Multi-Agent</a> •
  <a href="#-giấy-phép-license">License</a>
</p>

</div>

---

## 💡 Tổng quan & Triết lý Thiết kế (Why DocHub?)

Các giải pháp tài liệu phổ biến như Notion hay Confluence thường quá cồng kềnh, phụ thuộc mạng hoàn toàn và tốn chi phí duy trì. Khi cần chia sẻ một tài liệu kỹ thuật, kiến trúc giải pháp hoặc báo cáo tóm tắt cho khách hàng, các bộ Office truyền thống lại nặng nề và khó trình diễn linh hoạt.

**DocHub** ra đời nhằm giải quyết bài toán đó với 3 triết lý bất biến:

1. **⚡ Tốc độ tức thì (Zero-Latency Local Storage):** Toàn bộ dữ liệu sống (tệp `.md`, `.html`, ảnh và file đính kèm) được lưu trực tiếp trên ổ đĩa máy chủ (SSD/NVMe). Tuyệt đối không có độ trễ gọi Cloud Blob trong luồng đọc/ghi hàng ngày.
2. **🪶 Zero Bloatware:** Không ORM cồng kềnh, không daemon tìm kiếm nặng nề bên ngoài. Tận dụng sức mạnh tối đa của **SQLite FTS5** tích hợp sẵn để tìm kiếm toàn văn bản trong vài mili-giây.
3. **🎨 Chuẩn mực Trình bày Hiện đại:** Thiết kế giao diện theo phong cách **shadcn/ui** cao cấp, tối ưu hóa typography tiếng Việt với font chữ **Be Vietnam Pro** kết hợp khối code **JetBrains Mono**.

---

## ✨ Tính năng Cốt lõi (Key Features)

### 📝 Soạn thảo & Live-Preview Linh hoạt
- **Split-View Resizable:** Sử dụng `react-resizable-panels` cho phép điều chỉnh tỉ lệ khung soạn thảo và xem trước trực tiếp mượt mà.
- **CodeMirror Markdown Editor:** Hỗ trợ tô màu cú pháp, đánh số dòng, tự động đóng ngoặc (`@uiw/react-codemirror`).
- **Khả năng Render Toàn diện:**
  - 📊 **Mermaid Diagrams:** Vẽ lưu đồ, sơ đồ tuần tự và kiến trúc hệ thống trực tiếp từ code block ```` ```mermaid ````.
  - 🧮 **KaTeX (Math/LaTeX):** Hỗ trợ công thức toán học chuẩn xác với cú pháp `$...$` và `$$...$$`.
  - 🎨 **Syntax Highlighting:** Tô màu cú pháp khối mã đa ngôn ngữ qua `highlight.js`.
  - 🛡️ **HTML Sandboxed Iframe:** Render mã nguồn HTML tự do trong `<iframe sandbox="allow-scripts">` (không cấp `allow-same-origin`) để triệt tiêu mọi nguy cơ XSS.

### 🔍 Tìm kiếm Toàn văn bản Siêu tốc (FTS5)
- Hỗ trợ phím tắt **`Ctrl+K` / `Cmd+K`** mở Command Palette (`cmdk`).
- Tự động tách text thô và đồng bộ vào bảng ảo **SQLite FTS5** khi lưu file.
- Cấu hình tokenizer `unicode61 remove_diacritics 0` giúp **bảo toàn dấu tiếng Việt** khi tìm kiếm chính xác.

### 🌐 Chia sẻ Công khai Độc lập (Public Read-Only Sharing)
- Tạo liên kết chia sẻ dạng `/s/{share_id}` phục vụ đối tác/khách hàng xem nhanh mà không cần đăng nhập.
- Tùy chọn đặt **Mật khẩu bảo vệ** (băm an toàn bằng `bcrypt`) và **Ngày hết hạn** (expiration date).
- Cơ chế xác thực asset thông minh cho phép khách xem tải ảnh đính kèm theo quyền của tài liệu được chia sẻ.

### 🤖 Trí tuệ Nhân tạo BYOK (Bring Your Own Key)
- Tích hợp linh hoạt với **Azure AI Foundry** hoặc bất kỳ endpoint nào tương thích chuẩn OpenAI.
- Người dùng tự quản lý API Key và Endpoint qua giao diện Cài đặt (Settings UI).
- Hỗ trợ gợi ý danh mục, tag thông minh và dịch tài liệu tự động (Việt ⇄ Anh) tạo bản sao song ngữ.

### 🛡️ Sao lưu Đám mây Định kỳ (Off-site Azure Blob Backup)
- Sử dụng SQLite Online Backup API chụp snapshot nhất quán của cơ sở dữ liệu.
- Đóng gói toàn bộ database và thư mục tệp tin thành file nén `.tar.gz` không gây nghẽn luồng xử lý (`asyncio.to_thread`).
- Đẩy lên container `dochub-backups` của Azure Blob Storage với chính sách **lưu giữ 30 bản gần nhất** (tự động dọn dẹp các bản cũ).

---

## 🏛️ Kiến trúc Hệ thống (Architecture Overview)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (SPA)                            │
│  React 18 + TypeScript + Tailwind CSS + shadcn/ui                      │
│  Typography: "Be Vietnam Pro" (Sans) & "JetBrains Mono" (Code)         │
│  [Sidebar Tree] ── [Resizable Split-View] ── [Ctrl+K Command Palette]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API / Session Cookie
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND (Python)                        │
│  ├── Lifespan DB Init & WAL mode (PRAGMA journal_mode = WAL)           │
│  ├── Path Traversal Protection (_resolve_safe_path)                   │
│  ├── Routers: Auth, Documents, Folders, Tags, Search, Assets, Share, AI│
│  └── Azure AI Client (BYOK OpenAI-compatible)                          │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌────────────────────────┐       ┌────────────────────────┐
       │   SQLite (dochub.db)   │       │    LOCAL FILESYSTEM    │
       │  - documents, folders  │       │   (/app/data/storage/) │
       │  - tags, assets, share │       │ ├── documents/<id>/    │
       │  - FTS5 virtual table  │       │ └── assets/<doc_id>/   │
       └────────────────────────┘       └───────────┬────────────┘
                                                    │
                                                    │ Snapshot định kỳ (.tar.gz)
                                                    ▼
                                        ┌────────────────────────┐
                                        │   AZURE BLOB STORAGE   │
                                        │ (Container: dochub-back)│
                                        │ - Giữ 30 bản gần nhất  │
                                        └────────────────────────┘
```

---

## 🚀 Khởi chạy Nhanh (Quick Start)

### Lựa chọn 1: Triển khai qua Docker Compose (Khuyến nghị cho Production)

1. **Sao chép tệp cấu hình môi trường:**
   ```bash
   cp .env.example .env
   ```
2. **Cấu hình đường dẫn Docker trong `.env`:**
   ```env
   DB_PATH=/app/data/dochub.db
   STORAGE_PATH=/app/data/storage
   BACKUP_STAGING_PATH=/app/data/backups
   ```
3. **Khởi chạy container:**
   ```bash
   docker-compose up -d --build
   ```
   Ứng dụng sẽ tự động khởi tạo database và phục vụ tại cổng `8000`.

---

### Lựa chọn 2: Chạy trực tiếp trong môi trường Phát triển (Local Dev)

#### 1. Yêu cầu hệ thống
- **Python:** 3.11 trở lên
- **Node.js:** 18.x trở lên (npm 9+)

#### 2. Thiết lập biến môi trường & Mật khẩu
```bash
# Tạo file .env từ template (đường dẫn mặc định ../data đã sẵn sàng cho dev)
cp .env.example .env

# Tạo hash mật khẩu admin bằng bcrypt
python scripts/hash_password.py "MatKhauCuaBan123!"
# Dán chuỗi hash sinh ra vào biến APP_PASSWORD_HASH trong .env
```

#### 3. Khởi chạy Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> Khi backend khởi động lần đầu, database SQLite và bảng ảo FTS5 sẽ được tự động tạo qua FastAPI Lifespan handler.

#### 4. Khởi chạy Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Mở trình duyệt tại `http://localhost:5173`. Vite dev server đã cấu hình sẵn reverse proxy để tự động chuyển tiếp các request `/api` sang backend cổng `8000`.

---

## ⚙️ Cấu hình Biến Môi trường (.env)

| Biến môi trường | Mặc định (Local Dev) | Giá trị Production (Docker) | Mô tả |
|---|---|---|---|
| `APP_USERNAME` | `admin` | `admin` | Tài khoản đăng nhập quản trị duy nhất |
| `APP_PASSWORD_HASH` | *(Trống)* | *(Chuỗi bcrypt hash)* | Hash mật khẩu tạo từ `scripts/hash_password.py` |
| `SECRET_KEY` | *(Chuỗi ngẫu nhiên)* | *(Khóa bảo mật mạnh)* | Khóa bí mật dùng ký Session Cookie |
| `CORS_ORIGINS` | `http://localhost:5173` | `https://dochub.nhant.com` | Danh sách domain được phép gửi Cookie CORS |
| `DB_PATH` | `../data/dochub.db` | `/app/data/dochub.db` | Đường dẫn lưu file SQLite database |
| `STORAGE_PATH` | `../data/storage` | `/app/data/storage` | Thư mục lưu tệp nội dung và assets |
| `BACKUP_STAGING_PATH` | `../data/backups` | `/app/data/backups` | Thư mục nén snapshot backup tạm thời |
| `AZURE_STORAGE_CONNECTION_STRING`| *(Tùy chọn)* | *(Connection String)* | Kết nối Azure Blob Storage để backup định kỳ |
| `AZURE_STORAGE_BACKUP_CONTAINER` | `dochub-backups`| `dochub-backups` | Tên container lưu trữ file backup nén |

> 📌 **Lưu ý về AI:** API Key và Endpoint của Azure AI Foundry **không** đặt trong file `.env`. Người dùng sẽ nhập trực tiếp qua modal Cài đặt (Settings) trên giao diện.

---

## 🔒 Bảo mật & An toàn Dữ liệu (Security by Design)

- **Cách ly HTML bằng Sandbox <iframe>:** Trình duyệt render nội dung HTML trong `<iframe sandbox="allow-scripts">`. Tuyệt đối **không cấp cờ `allow-same-origin`**, ngăn chặn triệt để nguy cơ mã độc đọc trộm session cookie của ứng dụng chính.
- **Phòng chống Path Traversal:** Toàn bộ truy xuất tệp tin trong `storage.py` đều đi qua hàm kiểm tra tiền tố `_resolve_safe_path()`, vô hiệu hóa các đường dẫn dạng `../../.env`.
- **Bảo mật Xác thực:** Session cookie được ký mật mã với thuật toán an toàn, mật khẩu được băm qua `bcrypt` (12 rounds).
- **Quyền riêng tư Tuyệt đối:** Không theo dõi người dùng (telemetry), không chia sẻ dữ liệu với bên thứ ba, dữ liệu hoàn toàn thuộc quyền sở hữu của bạn trên máy chủ cá nhân.

---

## 🤖 Hệ thống Quản trị Đa Agent (Multi-Agent Continuity)

Dự án DocHub được thiết kế với cơ chế duy trì ngữ cảnh kỹ thuật xuyên suốt cho nhiều AI Agent (Claude Code, Antigravity, Cursor, Copilot) khi phối hợp qua Git:

- [AGENTS.md](AGENTS.md): "Hiến pháp kỹ thuật" và các bất biến kiến trúc không được vi phạm.
- [ARCHITECTURE.md](ARCHITECTURE.md): Bản vẽ luồng dữ liệu và thiết kế các tầng kiến trúc.
- [docs/PROGRESS.md](docs/PROGRESS.md): Bảng theo dõi tiến độ thời gian thực và giao thức bàn giao ca làm việc giữa các Agent.
- [docs/decisions/](docs/decisions/): Các biên bản quyết định kiến trúc (ADR) ghi lại lý do đằng sau mỗi lựa chọn công nghệ.

---

## 🗺️ Lộ trình Phát triển (Roadmap)

- [x] **Phase 1:** Project Scaffolding & Multi-Agent Context Setup.
- [x] **Audit & Hardening:** Khắc phục 23 lỗi kiến trúc và lỗ hổng kỹ thuật từ đợt PO Review.
- [ ] **Phase 2:** Backend Core (Session Cookie Auth & Middleware).
- [ ] **Phase 3:** Backend REST APIs (Documents, Folders, Tags, FTS5 Search, Asset Streaming).
- [ ] **Phase 4:** Frontend Foundation (Sidebar Navigation, Tag Filter, Theme Provider).
- [ ] **Phase 5:** Editor & Live Preview (Split-view, CodeMirror, Mermaid, KaTeX, Sandboxed Iframe).
- [ ] **Phase 6:** Search, Share & Version History UI (Ctrl+K Command Palette, Diff Viewer, Public Share).
- [ ] **Phase 7:** AI Integration (Azure AI Foundry BYOK, Tag Suggester, Bilingual Translation).
- [ ] **Phase 8:** Multi-stage Production Docker Deployment.

---

## 📄 Giấy phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Xem thêm chi tiết tại tệp [LICENSE](LICENSE).

---

<div align="center">
  <sub>Được phát triển với tinh thần Zero-Bloat, Hiệu năng Tức thì và Trải nghiệm Trình bày Hiện đại.</sub>
</div>
