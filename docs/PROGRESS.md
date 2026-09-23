# 📋 DocHub Living Progress & Handoff Tracker

> **DÀNH CHO AGENT TIẾP QUẢN:**
> - Luôn đọc mục **Current Focus** và **Next Steps** bên dưới trước khi bắt đầu code.
> - Sau khi hoàn thành công việc, hãy cập nhật trạng thái các mục `[x]` và ghi rõ nhiệm vụ bàn giao cho Agent tiếp theo.

---

## 🚀 Trạng thái Tổng thể Dự án (Overall Roadmap)

- [x] **Phase 1: Project Scaffolding & Multi-Agent Context Setup** *(HOÀN THÀNH)*
  - [x] Soạn thảo đặc tả kỹ thuật chuẩn hóa (`spec-doc-hub.md`)
  - [x] Thống nhất kiến trúc: Local Storage cho live data, Azure Blob chỉ dùng backup
  - [x] Thống nhất Frontend: React + Vite + Tailwind CSS + shadcn/ui + font Be Vietnam Pro
  - [x] Thiết lập "hiến pháp" và luật cho đa Agent (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`)
  - [x] Thiết lập sơ đồ kiến trúc (`ARCHITECTURE.md`) và ADR (`docs/decisions/0001-core-architecture-decisions.md`)
  - [x] Tạo khung thư mục `backend/`, `frontend/`, `scripts/`, `data/`
  - [x] Đã hoàn thành đợt rà soát Product Owner Audit & sửa chữa toàn bộ 23 lỗi/thiếu sót trước implementation

- [x] **Phase 2: Backend Core (Database, Local Storage & Auth)** *(HOÀN THÀNH)*
  - [x] Schema SQLite migration + FTS5 virtual table initialization (`backend/db.py`)
  - [x] Module quản lý tệp tin Local Storage: an toàn Path Traversal, read/write/versions/assets (`backend/storage.py`)
  - [x] Module sao lưu định kỳ: SQLite snapshot API, upload non-blocking, retention 30 bản (`backend/backup.py`)
  - [x] Module tích hợp AI: Azure AI Foundry / OpenAI-compatible client (`backend/ai.py`)
  - [x] CLI script tạo hash password (`scripts/hash_password.py`)
  - [x] Session-based authentication & cookie middleware (`backend/routers/auth.py`)

- [x] **Phase 3: Backend REST APIs (Full Features)** *(HOÀN THÀNH)*
  - [x] CRUD Documents & Versioning (`backend/routers/documents.py`)
  - [x] CRUD Folders tree (chặn xóa folder có dữ liệu) (`backend/routers/folders.py`)
  - [x] Tags management & many-to-many associations (`backend/routers/tags.py`)
  - [x] SQLite FTS5 Full-Text Search endpoint với snippet highlight (`backend/routers/search.py`)
  - [x] Asset upload & streaming endpoint kèm xác thực share `/api/assets/{id}` (`backend/routers/assets.py`)
  - [x] Public Share link management (`/s/{share_id}`) kèm password & expiration (`backend/routers/share.py`)
  - [x] AI endpoints: gợi ý tag & dịch tài liệu (`backend/routers/ai.py`)
  - [x] Settings endpoint: lưu cấu hình BYOK AI & Backup now trigger (`backend/routers/settings.py`)
  - [x] Lifespan APScheduler tự động sao lưu hàng ngày (`backend/main.py`)

- [x] **Phase 4: Frontend Foundation (React + Vite + Tailwind + shadcn/ui)** *(HOÀN THÀNH)*
  - [x] Cấu hình dependencies (`react-router-dom`, `diff`, `highlight.js`, `katex`, `cmdk`, `react-resizable-panels`)
  - [x] Cấu hình font **Be Vietnam Pro** (`@fontsource/be-vietnam-pro`) & **JetBrains Mono**
  - [x] Cấu hình ESM cho `tailwind.config.js` & `components.json` cho shadcn/ui
  - [x] Helper `src/lib/utils.ts` (`cn`)
  - [x] Bộ component shadcn/ui: `button`, `input`, `badge`, `dialog`, `tabs`, `dropdown-menu`, `resizable`, `sonner`
  - [x] Khởi tạo Router và Layout chính: Sidebar điều hướng (Folders & Tags) + Dashboard Workspace

- [x] **Phase 5: Editor & Live Preview** *(HOÀN THÀNH)*
  - [x] Tích hợp `react-resizable-panels` cho Split-view (Editor bên trái, Preview bên phải) (`src/components/EditorSplitView.tsx`)
  - [x] Tích hợp CodeMirror Markdown & HTML editor (`@uiw/react-codemirror`) (`src/components/CodeEditor.tsx`)
  - [x] Parser Markdown: `markdown-it` + GFM + KaTeX + Mermaid.js + Highlight.js (`src/components/MarkdownPreview.tsx`)
  - [x] HTML Preview với sandbox `<iframe>` (tuyệt đối KHÔNG cấp `allow-same-origin`) (`src/components/HtmlPreview.tsx`)
  - [x] Auto-save draft cục bộ (`localStorage`) chống mất dữ liệu khi soạn thảo kèm phím tắt Ctrl+S

- [x] **Phase 6: Search, Share & Version History UI** *(HOÀN THÀNH)*
  - [x] Command Palette (Ctrl+K) tìm kiếm toàn văn bản với `cmdk` và FTS5 snippet (`src/components/CommandPalette.tsx`)
  - [x] Modal xem lịch sử phiên bản (Version History) và so sánh Diff (`diff`) (`src/components/VersionHistoryModal.tsx`)
  - [x] Modal tạo link chia sẻ công khai (`/s/{share_id}`) kèm mật khẩu và ngày hết hạn (`src/components/ShareDialog.tsx`)
  - [x] Trang xem công khai Read-only tối giản cho khách hàng kèm in/PDF (`src/components/PublicShareView.tsx`)

- [x] **Phase 7: AI Integration (Azure AI Foundry BYOK)** *(HOÀN THÀNH)*
  - [x] Giao diện Cài đặt (Settings UI) nhập Endpoint + API Key + Model (`src/components/SettingsDialog.tsx`)
  - [x] Nút gợi ý Tag thông minh (Suggest tags chip UI trong Editor)
  - [x] Nút dịch thuật tài liệu tự động (Việt ⇄ Anh) tạo bản sao song ngữ độc lập

- [x] **Phase 8: Production Docker Deployment** *(HOÀN THÀNH)*
  - [x] Multi-stage Dockerfile (Node 20 build bundle -> Python 3.11 serve FastAPI) (`Dockerfile`)
  - [x] Docker Compose cấu hình volume mount `./data:/app/data` (`docker-compose.yml`)
  - [x] Tích hợp `add-docker.sh` cho production host `vm-sea-docker-01` (`scripts/add-docker.sh`)
  - [x] Mẫu biến môi trường hoàn thiện (`.env.example`)

---

## 🎯 Current Focus (Đang thực hiện)
* Toàn bộ 8 Phase của DocHub đã được triển khai hoàn tất theo đúng tài liệu đặc tả `spec-doc-hub.md` và `ARCHITECTURE.md`.
* Frontend bundle đã được biên dịch thành công (`dist/`).

---

## ⏭️ Next Steps for Next Agent (Nhiệm vụ cho Agent tiếp theo)
1. **Kiểm thử môi trường Runtime thực tế (Staging / Production):**
   - Chạy `python scripts/hash_password.py` để tạo hash mật khẩu thực tế cho người dùng.
   - Tạo file `.env` từ `.env.example`.
   - Khởi chạy docker compose: `docker compose up --build -d` hoặc chạy script `bash scripts/add-docker.sh`.
   - Truy cập giao diện tại `http://localhost:8000` hoặc domain production để kiểm tra tính năng.
