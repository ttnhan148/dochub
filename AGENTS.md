# 🤖 AGENTS.md — Universal AI Agent Guidelines for DocHub

> **LƯU Ý DÀNH CHO MỌI AI AGENT (Antigravity, Claude Code, Cursor, Copilot, v.v.):**
> Hãy đọc kỹ tài liệu này trước khi thực hiện bất kỳ thay đổi nào trong kho mã nguồn. Tài liệu này đóng vai trò là "Hiến pháp kỹ thuật" và quy tắc giao tiếp xuyên suốt giữa các AI Agent.

---

## 1. Tổng quan Dự án (Project Identity)
* **Tên dự án:** DocHub (`dochub`)
* **Mục đích:** Ứng dụng web cá nhân gọn nhẹ (Zero-bloat) để tổ chức, lưu trữ, phân loại, live-preview và chia sẻ tài liệu Markdown/HTML chuyên nghiệp cho khách hàng.
* **Tài liệu đặc tả gốc:** Luôn tham chiếu [spec-doc-hub.md](file:///c:/Users/Nhan.Tran/VibeProjects/dochub/spec-doc-hub.md) và [ARCHITECTURE.md](file:///c:/Users/Nhan.Tran/VibeProjects/dochub/ARCHITECTURE.md).

---

## 2. Các bất biến kiến trúc (ARCHITECTURAL INVARIANTS - KHÔNG ĐƯỢC VI PHẠM)

1. **Storage: LOCAL STORAGE LÀ CHÍNH, BLOB CHỈ ĐỂ BACKUP**
   - Mọi tệp nội dung (`.md`, `.html`), assets (ảnh/file đính kèm), và snapshot version history **BẮT BUỘC** lưu trên Local Storage cục bộ (`/app/data/storage/`).
   - Tuyệt đối **KHÔNG** gọi Azure Blob Storage trong luồng làm việc trực tiếp (đọc/ghi/preview/diff).
   - Azure Blob Storage chỉ được kích hoạt trong tác vụ nén Backup định kỳ hoặc nút "Backup now".
2. **Database: ZERO ORM + SQLite FTS5**
   - Sử dụng SQLite (`sqlite3` hoặc `aiosqlite`) với truy vấn raw SQL hoặc helper nhẹ.
   - Tuyệt đối **KHÔNG** cài đặt các ORM nặng nề như SQLAlchemy ORM đầy đủ hay Django ORM.
   - Bắt buộc dùng **SQLite FTS5** (`documents_fts`) để tìm kiếm toàn văn bản siêu tốc.
3. **Frontend: React + Vite + Tailwind CSS + shadcn/ui**
   - Giao diện xây dựng bằng React (TypeScript) với bộ component của **shadcn/ui** (dựa trên Radix UI primitives và Lucide icons).
   - Sử dụng `react-resizable-panels` cho Split-view (Editor & Live Preview).
   - Sử dụng `cmdk` cho Command Palette (Ctrl+K tìm kiếm).
4. **Typography: BẮT BUỘC DÙNG FONT "Be Vietnam Pro"**
   - Toàn bộ giao diện chính (UI, Sidebar, Dialog) và vùng đọc/preview tài liệu phải hiển thị bằng font **Be Vietnam Pro**.
   - Code block / Editor dùng monospace (`JetBrains Mono` / `Fira Code`).
5. **AI Model: BYOK (Bring Your Own Key)**
   - Không hardcode API key vào code hay `.env`. Người dùng nhập key và endpoint Azure AI Foundry qua Settings UI, lưu plain trong SQLite (môi trường single-user).
6. **Bảo mật HTML Preview: Sandbox `<iframe>`**
   - Khi render file HTML tự viết của người dùng, bắt buộc hiển thị bên trong `<iframe sandbox="allow-scripts">` để cách ly script khỏi ứng dụng chính.

---

## 3. Quy trình Chuyển giao Ca làm việc (Handoff Protocol)

Để các Agent khác nhau phối hợp mượt mà khi đồng bộ qua Git:
1. **Khi bắt đầu phiên làm việc (Start Session):**
   * Đọc [docs/PROGRESS.md](file:///c:/Users/Nhan.Tran/VibeProjects/dochub/docs/PROGRESS.md) để biết:
     - Tính năng nào đã hoàn thành.
     - Tính năng nào đang làm dở (In-Progress).
     - Việc tiếp theo cần làm (Next Steps).
   * Đọc [docs/decisions/](file:///c:/Users/Nhan.Tran/VibeProjects/dochub/docs/decisions/) nếu muốn hiểu lý do đằng sau các quyết định kiến trúc trước đây.
2. **Khi kết thúc phiên làm việc (End Session / Pre-commit):**
   * Cập nhật lại [docs/PROGRESS.md](file:///c:/Users/Nhan.Tran/VibeProjects/dochub/docs/PROGRESS.md):
     - Đánh dấu `[x]` các đầu việc đã hoàn thành và kèm ghi chú tóm tắt.
     - Cập nhật mục `Current Focus` và `Next Steps for Next Agent`.
   * Tạo Git Commit tuân theo chuẩn Conventional Commits:
     - `feat:` thêm tính năng mới
     - `fix:` sửa lỗi
     - `refactor:` tái cấu trúc mã nguồn
     - `docs:` cập nhật tài liệu/tiến độ

---

## 4. Sơ đồ Cấu trúc Dự án (Repository Layout)

```
dochub/
├── AGENTS.md                # Tệp này - Bản đồ chỉ dẫn chung cho AI Agents
├── ARCHITECTURE.md          # Thiết kế kỹ thuật chi tiết
├── CLAUDE.md                # Chỉ dẫn riêng cho Claude Code CLI
├── .cursorrules             # Chỉ dẫn riêng cho Cursor IDE
├── .env.example             # Mẫu biến môi trường
├── .gitignore               # Bộ lọc tệp git chuẩn
├── spec-doc-hub.md          # Bản đặc tả tính năng đầy đủ
├── docs/
│   ├── PROGRESS.md          # THEO DÕI TIẾN ĐỘ & BÀN GIAO GIỮA CÁC AGENT
│   └── decisions/           # Architecture Decision Records (ADR)
├── backend/                 # FastAPI Backend (Python 3.11+)
│   ├── main.py
│   ├── db.py                # Schema SQLite + FTS5
│   ├── storage.py           # Quản lý Local Filesystem
│   ├── backup.py            # Quản lý đóng gói & upload Azure Blob
│   ├── ai.py                # Client OpenAI-compatible (Azure AI Foundry)
│   ├── routers/             # API Endpoints
│   └── requirements.txt
├── frontend/                # React 18+ (Vite + TypeScript + Tailwind + shadcn/ui)
│   ├── src/
│   │   ├── components/ui/   # shadcn/ui components
│   │   ├── components/      # Domain components
│   │   ├── App.tsx
│   │   └── main.tsx
├── data/                    # Mounted volume (KHÔNG commit lên Git)
│   ├── dochub.db            # SQLite DB
│   ├── storage/             # Local documents & assets
│   └── backups/             # Local backup staging
└── scripts/                 # CLI tools & tiện ích vận hành
```

---

## 5. Lệnh Phát triển Thường Dùng (Quick Commands)

* **Backend Dev (Python):**
  ```bash
  cd backend
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  ```
* **Frontend Dev (Node/Vite):**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
* **Tạo Hash Mật khẩu:**
  ```bash
  python scripts/hash_password.py "mat_khau_cua_ban"
  ```
