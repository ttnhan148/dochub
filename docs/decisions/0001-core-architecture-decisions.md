# ADR 0001: Core Architecture Decisions for DocHub

* **Trạng thái:** Accepted (Đã chấp thuận)
* **Ngày quyết định:** 2026-09-22 (Cập nhật: 2026-09-23)
* **Người quyết định:** Project Owner & Antigravity Lead Architect

---

## 1. Bối cảnh (Context)
DocHub là công cụ cá nhân phục vụ việc tổ chức, chỉnh sửa và trình diễn tài liệu Markdown/HTML thay thế các phần mềm Office nặng nề. Cần đảm bảo hệ thống phản hồi tức thì, không phát sinh chi phí duy trì cố định lớn, dễ dàng bảo trì và đồng bộ mượt mà giữa các AI Agent qua Git.

---

## 2. Các quyết định kiến trúc cốt lõi (Decisions)

### 2.1. Local Storage là chính, Azure Blob chỉ dùng cho Backup
* **Quyết định:** Toàn bộ dữ liệu sống (live files `.md`, `.html`, ảnh đính kèm và snapshot lịch sử) lưu trên ổ cứng cục bộ (`/app/data/storage/`). Azure Blob Storage chỉ dùng để lưu trữ các tệp nén sao lưu định kỳ (`.tar.gz`).
* **Lý do:**
  * Zero latency: đọc/ghi file và tải ảnh tức thì từ ổ cứng NVMe/SSD, không phụ thuộc độ trễ mạng ra ngoài.
  * Hoạt động offline/local dev 100% không cần kết nối Azure.
  * Tránh phát sinh chi phí transaction/data transfer thường xuyên trên cloud.

### 2.2. Không dùng ORM nặng, dùng SQLite3 + FTS5
* **Quyết định:** Sử dụng SQLite với raw SQL hoặc thư viện bất đồng bộ nhẹ (`aiosqlite`). Sử dụng FTS5 virtual table cho full-text search với `tokenize='unicode61 remove_diacritics 0'` bảo toàn dấu tiếng Việt.
* **Lý do:**
  * Giữ đúng triết lý "Zero-bloat": không cần SQLAlchemy hay Django ORM cồng kềnh.
  * FTS5 tích hợp sẵn giải quyết trọn vẹn bài toán tìm kiếm nhanh theo tiêu đề và nội dung mà không cần thêm daemon service ngoài (như Elasticsearch hay Meilisearch).
  * Kích hoạt SQLite WAL mode (`PRAGMA journal_mode = WAL;`) và `busy_timeout` để đảm bảo đồng thời cao giữa đọc và ghi.

### 2.3. Frontend: React + Vite + Tailwind CSS + shadcn/ui
* **Quyết định:** Xây dựng Single Page App với React + Vite + TypeScript, giao diện dùng Tailwind CSS và các component theo thiết kế shadcn/ui (dựa trên Radix UI primitives).
* **Lý do:**
  * Cung cấp sẵn các component phức tạp nhưng siêu mượt: Split-view resizable (`react-resizable-panels`), Command search palette (`cmdk`), Sidebar cây thư mục lồng nhau (`collapsible`), Modals (`dialog`, `sheet`), Toast thông báo (`sonner`).
  * Trải nghiệm người dùng (UX) hiện đại, chuyên nghiệp khi trình chiếu cho đối tác/khách hàng.

### 2.4. Bắt buộc sử dụng font chữ "Be Vietnam Pro"
* **Quyết định:** Font mặc định cho giao diện và vùng hiển thị tài liệu là **Be Vietnam Pro**.
* **Lý do:**
  * Đây là font chữ sans-serif hiện đại được thiết kế chuyên biệt cho tiếng Việt và hệ ký tự Latin, đảm bảo dấu câu tiếng Việt không bị lỗi font hay vỡ bố cục khi trình bày.

### 2.5. Tích hợp AI mô hình BYOK (Bring Your Own Key)
* **Quyết định:** Không cấu hình cố định API Key trong `.env`. Người dùng nhập API Key và Endpoint Azure AI Foundry qua giao diện Cài đặt (Settings UI).
* **Lý do:**
  * Linh hoạt chuyển đổi model hoặc endpoint.
  * Lưu trữ plain text trong SQLite được chấp nhận vì đây là ứng dụng single-user trên máy chủ cá nhân cô lập.

### 2.6. Cách ly bảo mật HTML Preview bằng Sandboxed Iframe (Không cấp `allow-same-origin`)
* **Quyết định:** Khi render nội dung HTML của người dùng, bắt buộc nhúng vào `<iframe sandbox="allow-scripts">`. Tuyệt đối **KHÔNG** thêm cờ `allow-same-origin`.
* **Lý do:**
  * Cho phép JavaScript tự viết của người dùng chạy trong bản xem trước (ví dụ animation, script biểu đồ tùy biến).
  * Việc loại bỏ `allow-same-origin` ngăn chặn triệt để script bên trong iframe truy cập cookies, `localStorage` hay DOM của ứng dụng chính DocHub.

### 2.7. Font Monospace chuyên dụng cho Editor và Code Block
* **Quyết định:** Sử dụng **JetBrains Mono** hoặc **Fira Code** làm font monospace cho vùng soạn thảo CodeMirror và các khối `<pre><code>`.
* **Lý do:**
  * Cung cấp khả năng hiển thị code rõ ràng, phân biệt ký tự tốt (0/O, 1/l/I) và ligature thẩm mỹ cao.

### 2.8. Chính sách lưu giữ bản sao lưu (Backup Retention Policy)
* **Quyết định:** Giữ 30 bản sao lưu `.tar.gz` gần nhất trên cả Azure Blob Storage và thư mục staging cục bộ (`/app/data/backups/`).
* **Lý do:**
  * Đảm bảo khả năng phục hồi dữ liệu trong vòng 30 ngày.
  * Tự động dọn dẹp các bản cũ hơn để tránh làm đầy ổ đĩa local và tiết kiệm chi phí lưu trữ Azure Blob.

### 2.9. Bảo vệ chống tấn công Path Traversal
* **Quyết định:** Mọi thao tác truy cập tệp trong `backend/storage.py` bắt buộc phải đi qua hàm kiểm tra tiền tố đường dẫn chuẩn hóa `_resolve_safe_path`.
* **Lý do:**
  * Ngăn ngừa nguy cơ kẻ tấn công gửi relative path (ví dụ `../../.env`) để đánh cắp các tệp bí mật trên hệ thống.

---

## 3. Hệ quả (Consequences)
* Mọi AI Agent tiếp theo làm việc trên repository này **KHÔNG ĐƯỢC PHÉP** tự ý thay đổi các nguyên tắc kiến trúc trên trừ khi có yêu cầu rõ ràng từ người dùng.
