# 📄 DocHub

> **DocHub** — Markdown & HTML Knowledge Base & Presentation Tool.
> Ứng dụng web cá nhân gọn nhẹ, tốc độ cao giúp tổ chức, lưu trữ, xem trước trực tiếp (live-preview) và chia sẻ tài liệu Markdown/HTML chuyên nghiệp.

---

## ✨ Điểm nổi bật (Features)

* **⚡ Hiệu năng tức thì (Zero-Latency Local Storage):** Lưu trữ toàn bộ dữ liệu, tài liệu và assets ngay trên ổ đĩa cục bộ của máy chủ.
* **📝 Trình soạn thảo & Split-View linh hoạt:** Soạn thảo bằng CodeMirror, xem trước theo thời gian thực (real-time preview) với thanh trượt co giãn linh hoạt (`react-resizable-panels`).
* **📊 Đầy đủ tính năng hiển thị tài liệu:**
  * Mermaid Diagrams (vẽ biểu đồ, sơ đồ luồng, kiến trúc trực tiếp).
  * KaTeX (hỗ trợ công thức toán học/LaTeX chuẩn xác).
  * Syntax Highlighting (`highlight.js`).
  * Bảng GFM và iframe sandbox an toàn (`<iframe sandbox="allow-scripts">` không cấp `allow-same-origin`) cho tài liệu HTML.
* **🔍 Tìm kiếm toàn văn bản (FTS5):** Tìm kiếm siêu tốc theo tiêu đề và nội dung với SQLite FTS5 (hỗ trợ phím tắt `Ctrl+K` / `Cmd+K`), bảo toàn dấu tiếng Việt.
* **🌐 Chia sẻ Read-only an toàn:** Tạo link chia sẻ công khai cho khách hàng, hỗ trợ đặt mật khẩu và ngày hết hạn.
* **🤖 Trí tuệ nhân tạo (BYOK AI):** Tích hợp Azure AI Foundry (chuẩn OpenAI) để gợi ý tag, tự động phân loại và dịch tài liệu song ngữ.
* **🛡️ Sao lưu an toàn lên Azure Blob:** Tự động nén database và tệp tin đẩy lên Azure Blob Storage dự phòng (chính sách lưu 30 bản).
* **🎨 Giao diện hiện đại & Font tiếng Việt:** Thiết kế theo chuẩn `shadcn/ui` và Tailwind CSS với font chữ **Be Vietnam Pro** và monospace **JetBrains Mono**.

---

## 🛠️ Tech Stack

* **Backend:** Python 3.11+, FastAPI, SQLite3 + FTS5 (`aiosqlite`).
* **Frontend:** React 18+, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Lucide React.
* **Typography:** Be Vietnam Pro (`@fontsource/be-vietnam-pro`) & JetBrains Mono.
* **Storage & Backup:** Local Filesystem (Primary) + Azure Blob Storage (Backup Only).
* **Containerization:** Docker (Multi-stage build) & Docker Compose.

---

## 🚀 Khởi chạy Nhanh (Quick Start)

### 1. Cấu hình biến môi trường
```bash
cp .env.example .env
# Chỉnh sửa file .env với thông tin tài khoản mong muốn
# Lưu ý: Khi chạy Local Dev ngoài Docker, đường dẫn DB_PATH=../data/dochub.db mặc định trong .env.example đã được cấu hình sẵn.
```

### 2. Tạo Hash Mật khẩu
```bash
python scripts/hash_password.py "mat_khau_cua_ban"
# Dán chuỗi hash sinh ra vào biến APP_PASSWORD_HASH trong .env
```

### 3. Khởi chạy trong môi trường phát triển (Local Dev)
* **Backend:**
  ```bash
  cd backend
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  ```
  *(Khi backend khởi động lần đầu, database SQLite và bảng ảo FTS5 sẽ được tự động khởi tạo qua lifespan handler).*

* **Frontend:**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  *(Truy cập `http://localhost:5173`, Vite dev server sẽ tự động proxy các request `/api` sang backend cổng 8000).*

### 4. Triển khai bằng Docker (Production)
```bash
# Điều chỉnh DB_PATH=/app/data/dochub.db và STORAGE_PATH=/app/data/storage trong .env
docker-compose up -d --build
```

---

## 🤖 Hướng dẫn dành cho AI Agents

Nếu bạn là AI Agent (Antigravity, Claude Code, Cursor, Copilot, v.v.), hãy đọc kỹ các tài liệu sau trước khi thực hiện tác vụ:
1. [AGENTS.md](AGENTS.md): "Hiến pháp kỹ thuật" và quy tắc bất biến của dự án.
2. [ARCHITECTURE.md](ARCHITECTURE.md): Kiến trúc hệ thống và luồng dữ liệu chi tiết.
3. [docs/PROGRESS.md](docs/PROGRESS.md): Trạng thái tiến độ hiện tại và việc cần làm tiếp theo.
