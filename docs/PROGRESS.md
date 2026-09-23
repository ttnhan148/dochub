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

- [ ] **Phase 2: Backend Core (Database, Local Storage & Auth)**
  - [x] Schema SQLite migration + FTS5 virtual table initialization (`backend/db.py`)
  - [x] Module quản lý tệp tin Local Storage: an toàn Path Traversal, read/write/versions/assets (`backend/storage.py`)
  - [x] Module sao lưu định kỳ: SQLite snapshot API, upload non-blocking, retention 30 bản (`backend/backup.py`)
  - [x] Module tích hợp AI: Azure AI Foundry / OpenAI-compatible client (`backend/ai.py`)
  - [x] CLI script tạo hash password (`scripts/hash_password.py`)
  - [ ] Session-based authentication & cookie middleware (`backend/routers/auth.py`)

- [ ] **Phase 3: Backend REST APIs (Full Features)**
  - [ ] CRUD Documents & Versioning (`backend/routers/documents.py`)
  - [ ] CRUD Folders tree (chặn xóa folder có dữ liệu) (`backend/routers/folders.py`)
  - [ ] Tags management & many-to-many associations (`backend/routers/tags.py`)
  - [ ] SQLite FTS5 Full-Text Search endpoint với snippet highlight (`backend/routers/search.py`)
  - [ ] Asset upload & streaming endpoint kèm xác thực share `/api/assets/{id}` (`backend/routers/assets.py`)
  - [ ] Public Share link management (`/s/{share_id}`) kèm password & expiration (`backend/routers/share.py`)
  - [ ] AI endpoints: gợi ý tag & dịch tài liệu (`backend/routers/ai.py`)
  - [ ] Settings endpoint: lưu cấu hình BYOK AI (`backend/routers/settings.py`)

- [ ] **Phase 4: Frontend Foundation (React + Vite + Tailwind + shadcn/ui)**
  - [x] Cấu hình dependencies (`react-router-dom`, `diff`, `highlight.js`, `katex`, `cmdk`, `react-resizable-panels`)
  - [x] Cấu hình font **Be Vietnam Pro** (`@fontsource/be-vietnam-pro`) & **JetBrains Mono**
  - [x] Cấu hình ESM cho `tailwind.config.js` & `components.json` cho shadcn/ui
  - [x] Helper `src/lib/utils.ts` (`cn`)
  - [ ] Khởi tạo Router và Layout chính: Sidebar điều hướng (Folders & Tags) + Main Workspace

- [ ] **Phase 5: Editor & Live Preview**
  - [ ] Tích hợp `react-resizable-panels` cho Split-view (Editor bên trái, Preview bên phải)
  - [ ] Tích hợp CodeMirror Markdown editor (`@uiw/react-codemirror`)
  - [ ] Parser Markdown: `markdown-it` + GFM + KaTeX + Mermaid.js + Highlight.js
  - [ ] HTML Preview với sandbox `<iframe>` (tuyệt đối KHÔNG cấp `allow-same-origin`)
  - [ ] Auto-save draft cục bộ (`localStorage`) chống mất dữ liệu khi soạn thảo

- [ ] **Phase 6: Search, Share & Version History UI**
  - [ ] Command Palette (Ctrl+K) tìm kiếm toàn văn bản với `cmdk`
  - [ ] Modal xem lịch sử phiên bản (Version History) và so sánh Diff (`diff`)
  - [ ] Modal tạo link chia sẻ công khai (`/s/{share_id}`) kèm mật khẩu và ngày hết hạn
  - [ ] Trang xem công khai Read-only tối giản cho khách hàng

- [ ] **Phase 7: AI Integration (Azure AI Foundry BYOK)**
  - [ ] Giao diện Cài đặt (Settings UI) nhập Endpoint + API Key + Model
  - [ ] Nút gợi ý Tag thông minh (Suggest tags chip UI)
  - [ ] Nút dịch thuật tài liệu tự động (Việt ⇄ Anh) tạo bản sao song ngữ

- [ ] **Phase 8: Production Docker Deployment**
  - [ ] Multi-stage Dockerfile (Node build bundle -> Python FastAPI serve)
  - [ ] Docker Compose cấu hình volume mount `./data:/app/data`
  - [ ] Tích hợp `add-docker.sh` cho production host `vm-sea-docker-01`

---

## 🎯 Current Focus (Đang thực hiện)
* Hoàn tất rà soát Product Owner Review và sửa toàn bộ lỗi kỹ thuật / thiếu sót nền móng.

---

## ⏭️ Next Steps for Next Agent (Nhiệm vụ cho Agent tiếp theo)
1. **Triển khai Authentication (`backend/routers/auth.py`):**
   - Viết endpoint `POST /api/auth/login` (so khớp `APP_USERNAME` và `APP_PASSWORD_HASH` qua `bcrypt`).
   - Viết endpoint `POST /api/auth/logout`.
   - Viết endpoint `GET /api/auth/me` để kiểm tra phiên đăng nhập.
   - Viết dependency `get_current_user` kiểm tra signed session cookie bằng `SECRET_KEY`.
   - Kết nối `auth.router` vào `backend/main.py`.
2. **Triển khai Documents & Folders CRUD (`backend/routers/documents.py`, `backend/routers/folders.py`):**
   - Tạo, đọc, cập nhật, xóa tài liệu và đồng bộ vào `documents_fts`.
   - Quản lý cây thư mục cha-con và ràng buộc RESTRICT khi xóa.
