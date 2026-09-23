# SPEC: Doc Hub — Markdown/HTML Knowledge Base & Presentation Tool

> **Project codename:** `dochub` (đặt tên thật ở mục 1.1)
> **Mục đích:** Web app cá nhân để tổ chức, lưu trữ, phân loại, live-preview và chia sẻ tài liệu Markdown/HTML — thay thế bộ Office nặng nề khi trình bày cho khách hàng.

---

## 1. Tổng quan

### 1.1 Thông tin project
| Mục | Giá trị |
|---|---|
| Tên project | **DocHub** (`dochub`) |
| Subdomain | `dochub.nhant.com` (dự phòng: `dochub.nhan.dedyn.io`) |
| Host | VM Docker hiện có (`vm-sea-docker-01`, theo AzureLab Topology) |
| Container path | `/opt/docker/apps/dochub/` |

### 1.2 Người dùng
- Giai đoạn 1: **single-user** (chỉ chủ sở hữu dùng), không cần đăng ký/nhiều role.
- Đăng nhập: username/password đơn giản (session-based), không tích hợp Azure AD ở giai đoạn này.

### 1.3 Mục tiêu chính
1. Lưu trữ & phân loại tài liệu Markdown/HTML theo folder tree + tag trên **Local Storage** (hiệu năng cao, zero network latency).
2. Soạn thảo trực tiếp trên web với live preview (split-view).
3. Chia sẻ ra ngoài dưới dạng trang render sẵn (read-only) cho khách hàng.
4. Tích hợp AI (BYOK qua Azure AI Foundry, OpenAI-compatible endpoint) cho auto-tag/category và dịch nội dung.
5. Sao lưu dự phòng định kỳ (Backup) toàn bộ database và tệp tin lên **Azure Blob Storage**.

---

## 2. Kiến trúc & Stack kỹ thuật

### 2.1 Stack
- **Backend:** FastAPI (Python), theo pattern quen thuộc của các project cá nhân trước (DownloadHub, HomeFlix).
- **Database:** SQLite (không dùng ORM nặng — raw SQL hoặc thư viện nhẹ như `sqlite3`/`aiosqlite`) + **SQLite FTS5** cho Full-Text Search.
- **Frontend:** React + Vite + TypeScript, giao diện xây dựng với **Tailwind CSS** và các component theo thiết kế **shadcn/ui** (dựa trên Radix UI primitives, Lucide icons, `react-resizable-panels`, `cmdk`). Font chữ giao diện chính: **Be Vietnam Pro** (nhúng qua `@fontsource/be-vietnam-pro` hoặc Google Fonts, tối ưu hiển thị tiếng Việt).
- **Primary File Storage (Live App):** **Local Storage** — toàn bộ nội dung file .md/.html, assets đính kèm (ảnh, file) và các snapshot version history được lưu trực tiếp trên ổ đĩa cục bộ (thư mục `/app/data/storage/` gắn volume `./data`), đảm bảo tốc độ đọc/ghi tức thì, không độ trễ mạng và hoạt động offline/local hoàn hảo.
- **Remote Backup:** **Azure Blob Storage** — chỉ dùng cho tác vụ sao lưu định kỳ (upload file nén snapshot DB + files lên container `dochub-backups`).
- **AI:** Gọi endpoint **OpenAI-compatible** trỏ tới **Azure AI Foundry** deployment, dùng API key + endpoint do user nhập (BYOK).
- **Deployment:** Docker container (multi-stage build: Node.js build frontend bundle -> Python FastAPI serve static file + API), join network `lab-network`, expose qua `nginx-proxy` + `acme-companion` (Let's Encrypt).

### 2.2 Cấu trúc thư mục đề xuất
```
/opt/docker/apps/dochub/
├── docker-compose.yml
├── Dockerfile               # Multi-stage build (Node build FE -> Python runtime BE)
├── .env
├── backend/
│   ├── main.py              # FastAPI entrypoint (serve API & static FE)
│   ├── db.py                 # SQLite schema + FTS5 queries
│   ├── storage.py            # Local File Storage manager (documents, assets, versions)
│   ├── backup.py             # Azure Blob Backup manager (archive & push to dochub-backups)
│   ├── ai.py                 # AI client (OpenAI-compatible calls)
│   ├── routers/
│   │   ├── auth.py
│   │   ├── documents.py
│   │   ├── folders.py
│   │   ├── tags.py
│   │   ├── search.py
│   │   ├── assets.py
│   │   ├── share.py
│   │   ├── ai.py
│   │   └── settings.py
│   └── requirements.txt
├── frontend/                # React + Vite + TypeScript + Tailwind + shadcn/ui
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── components.json      # shadcn/ui configuration
│   └── src/
│       ├── components/ui/   # shadcn/ui components (button, dialog, resizable, command...)
│       ├── components/      # Domain components (FolderTree, EditorSplitView, ShareDialog...)
│       ├── hooks/
│       ├── App.tsx
│       └── main.tsx
└── data/                    # Mounted Volume (chứa toàn bộ data & storage sống)
    ├── dochub.db            # SQLite database file (metadata + FTS5 index)
    ├── backups/             # Staging backup tạm trước khi upload lên Azure Blob
    └── storage/             # Thư mục lưu trữ tệp cục bộ
        ├── documents/       # <document_id>/current.md và versions/<version_id>.md
        └── assets/          # <document_id>/<uuid>_<filename>
```

### 2.3 Environment variables (.env)
```
APP_USERNAME=admin
APP_PASSWORD_HASH=                 # sinh bằng script CLI
SECRET_KEY=                        # session signing key
DB_PATH=/app/data/dochub.db
STORAGE_PATH=/app/data/storage
BACKUP_STAGING_PATH=/app/data/backups

# Azure Blob Storage (chỉ dùng cho Backup định kỳ)
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_BACKUP_CONTAINER=dochub-backups
```
> AI API key/endpoint **không** đặt trong `.env` — được nhập và lưu qua Settings UI (xem mục 6).

---

## 3. Data Model (SQLite)

### 3.1 `documents`
| Field | Type | Ghi chú |
|---|---|---|
| id | TEXT (UUID) PK | |
| title | TEXT | |
| type | TEXT | `markdown` \| `html` |
| folder_id | TEXT FK → folders.id | nullable (root) |
| file_path | TEXT | đường dẫn tệp nội dung trong local storage (`documents/<id>/current.md`) |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| current_version_id | TEXT FK → document_versions.id | |

### 3.2 `document_versions`
| Field | Type | Ghi chú |
|---|---|---|
| id | TEXT (UUID) PK | |
| document_id | TEXT FK | |
| file_path | TEXT | snapshot nội dung tại thời điểm lưu (`documents/<doc_id>/versions/<id>.md`) |
| created_at | DATETIME | |
| note | TEXT | optional, ghi chú thay đổi |

### 3.3 `folders`
| Field | Type | Ghi chú |
|---|---|---|
| id | TEXT (UUID) PK | |
| name | TEXT | |
| parent_id | TEXT FK → folders.id | nullable |

### 3.4 `tags`
| Field | Type |
|---|---|
| id | TEXT (UUID) PK |
| name | TEXT UNIQUE |

### 3.5 `document_tags` (many-to-many)
| document_id | tag_id |
|---|---|

### 3.6 `assets`
| Field | Type | Ghi chú |
|---|---|---|
| id | TEXT (UUID) PK | |
| document_id | TEXT FK | tài liệu chứa asset này |
| filename | TEXT | tên file gốc |
| file_path | TEXT | đường dẫn local storage (`assets/<doc_id>/<uuid>_<filename>`) |
| mime_type | TEXT | |
| size_bytes | INTEGER | |
| created_at | DATETIME | |

### 3.7 `shares`
| Field | Type | Ghi chú |
|---|---|---|
| id | TEXT (UUID) PK | dùng làm token trong URL |
| document_id | TEXT FK | |
| password_hash | TEXT | nullable — nếu null thì public không cần password |
| expires_at | DATETIME | nullable — nếu null thì không hết hạn |
| created_at | DATETIME | |
| revoked | BOOLEAN | default false |

### 3.8 `ai_settings`
| Field | Type | Ghi chú |
|---|---|---|
| id | INTEGER PK (single row) | |
| api_base_url | TEXT | endpoint Azure AI Foundry (OpenAI-compatible) |
| api_key | TEXT | lưu **plain text** (đã xác nhận — single-user, VM riêng) |
| model_name | TEXT | tên deployment model |
| updated_at | DATETIME | |

### 3.9 `documents_fts` (SQLite FTS5 Virtual Table)
| Field | Type | Ghi chú |
|---|---|---|
| document_id | UNINDEXED | Khóa ngoại mềm liên kết tới `documents.id` |
| title | TEXT | Tiêu đề tài liệu |
| plain_content | TEXT | Nội dung thô (đã strip markdown/HTML tags) để FTS5 index siêu tốc |

---

## 4. Tính năng chi tiết

### 4.1 Tổ chức & Phân loại
- **Folder tree**: lồng nhau không giới hạn cấp, thao tác kéo-thả (drag & drop) di chuyển document/folder — nice-to-have; bắt buộc tối thiểu: tạo/sửa/xoá/di chuyển qua dropdown chọn folder cha.
- **Quy tắc xóa folder:** Mặc định chặn xóa (RESTRICT) nếu folder đang chứa tài liệu hoặc thư mục con để bảo vệ an toàn dữ liệu. Giao diện hiển thị cảnh báo và hướng dẫn người dùng chuyển tài liệu ra Root hoặc xóa tài liệu trước.
- **Tag**: gắn nhiều tag/document, autocomplete khi gõ, tạo tag mới inline.
- **Kết hợp lọc**: sidebar cho phép filter theo folder + tag đồng thời.

### 4.2 Full-text Search
- Search theo tiêu đề + nội dung file (query bảng ảo `documents_fts` trong SQLite FTS5 — nội dung plain text được tự động đồng bộ khi Save file vào Local Storage).
- SQLite FTS5 cho tốc độ truy vấn tức thì, hỗ trợ trích đoạn (snippet highlight), không cần thêm bất kỳ service search ngoài nào (Elasticsearch/Meilisearch không cần thiết).
- Kết quả trả về: tiêu đề, snippet highlight, folder, tag.

### 4.3 Assets đính kèm
- Upload ảnh/file trong lúc soạn thảo (drag-drop vào editor hoặc nút "Insert file").
- Lưu vào **Local Storage** dưới đường dẫn `storage/assets/<document_id>/<uuid>_<filename>`.
- Phục vụ tệp tĩnh qua endpoint backend: `/api/assets/{asset_id}` (hỗ trợ `Cache-Control`).
- **Xác thực truy cập Asset:** Endpoint `/api/assets/{asset_id}` kiểm tra:
  1. Người dùng đã đăng nhập phiên làm việc chính (chủ sở hữu).
  2. HOẶC asset thuộc về tài liệu đang có liên kết chia sẻ công khai hợp lệ (`share_id`), cho phép khách xem tải ảnh mà không cần đăng nhập tài khoản chính.
- Trong markdown: chèn tự động `![alt](/api/assets/<asset_id>)`; trong HTML: chèn `<img src="/api/assets/<asset_id>">`.
- Không giới hạn dung lượng file upload (theo yêu cầu) — cảnh báo mềm (soft warning) ở FE nếu file > 50MB để tránh nghẽn mạng, không chặn cứng.

### 4.4 Version History
- Mỗi lần người dùng bấm **Save** (hoặc tổ hợp `Ctrl+S` / `Cmd+S`, không phải mỗi keystroke) tạo 1 bản `document_versions` mới, snapshot nội dung thành file riêng tại `storage/documents/<doc_id>/versions/<version_id>.md` (hoặc `.html`) trong Local Storage.
- UI: tab "History" trên mỗi document — list các version theo thời gian, click để xem diff hoặc restore (khôi phục = tạo version mới từ bản cũ).
- Diff view: dùng thư viện JS nhẹ (`diff` / `jsdiff`) để hiển thị thay đổi giữa 2 version.

### 4.5 Editor & Live Preview
- **Split-view**: Sử dụng component **Resizable** (`react-resizable-panels` theo shadcn/ui), pane trái soạn thảo, pane phải render preview real-time (debounce ~300ms), người dùng có thể kéo thả thanh ngăn cách để điều chỉnh tỉ lệ kích thước 2 bên hoặc ẩn/hiện một pane.
- **Markdown editor**: dùng **CodeMirror** (thông qua `@uiw/react-codemirror`), hỗ trợ syntax highlighting cho code block, line numbering, auto-pairing brackets.
- **HTML editor**: cũng split-view, pane phải render trong `<iframe sandbox="allow-scripts">` để cách ly script khỏi app chính. **CẢNH BÁO BẢO MẬT:** Tuyệt đối KHÔNG thêm cờ `allow-same-origin` vào sandbox iframe để triệt tiêu nguy cơ script trong tài liệu đọc cắp session cookie của DocHub.
- **Bộ UI Components (shadcn/ui):**
  - **Resizable:** Split pane trái/phải cho Editor và Preview.
  - **Command (`cmdk`):** Command palette (Cmd/Ctrl + K) phục vụ Full-text Search và điều hướng nhanh tài liệu.
  - **Sidebar / Collapsible:** Quản lý cây thư mục (folder tree) và danh sách tài liệu.
  - **Dialog & Sheet:** Dùng cho pop-up Cài đặt (Settings BYOK AI), Hộp thoại Chia sẻ (Share dialog), và chi tiết Version History.
  - **Tabs:** Chuyển đổi linh hoạt giữa chế độ Split-view, Full-editor, Full-preview hoặc xem Diff lịch sử.
  - **Badge:** Hiển thị danh sách tag, chip gợi ý từ AI, tag trạng thái dịch ("translated").
  - **Dropdown Menu / Context Menu:** Menu thao tác nhanh trên tài liệu/folder (Đổi tên, Xoá, Di chuyển, Chia sẻ, Dịch AI).
  - **Sonner / Toast:** Thông báo trạng thái auto-save, copy link chia sẻ, cảnh báo lỗi AI.
- **Markdown rendering parser (Chốt chuẩn):**
  - Parser chính: **`markdown-it`** cùng các plugin mở rộng.
  - Mermaid diagram (`mermaid.js`, block ```` ```mermaid ```` )
  - Math/LaTeX (`KaTeX`, cú pháp `$...$` và `$$...$$`) kèm file CSS `katex.min.css`
  - Code syntax highlighting (`highlight.js`)
- **Typography & Font:**
  - **Font chính (UI & Reading):** **Be Vietnam Pro** (nhúng thông qua `@fontsource/be-vietnam-pro` hoặc Google Fonts), cấu hình làm font mặc định (`font-sans`) cho Tailwind CSS và toàn bộ giao diện app cũng như khung preview tài liệu. Đảm bảo hiển thị dấu tiếng Việt sắc nét, hiện đại, chuẩn typography cho cả đọc và thuyết trình.
  - **Font code / monospace:** `JetBrains Mono` hoặc `Fira Code` (kèm fallback `monospace`) cho vùng CodeMirror editor và các khối code block (`pre`, `code`).
- **Cơ chế Auto-save Draft an toàn:** Auto-save draft chỉ ghi tạm vào `localStorage` của trình duyệt (debounce 1-2s) để tránh mất nội dung khi rớt mạng hoặc đóng trình duyệt đột ngột. Chỉ khi người dùng chủ động nhấn **Save** (`Ctrl+S`) thì backend mới nhận lệnh lưu đè vào file `current` và tạo snapshot version lịch sử mới. Tránh tình trạng auto-save liên tục làm rác cơ sở dữ liệu và phình to ổ đĩa.

### 4.6 Upload file có sẵn
- Kéo-thả file `.md`/`.html` vào để import trực tiếp thành document mới, giữ nguyên nội dung, mở luôn ở chế độ edit.

### 4.7 Chia sẻ (Share)
- Nút "Share" trên mỗi document → tạo 1 `share` record với URL dạng `https://<subdomain>/s/<share_id>`.
- Tuỳ chọn khi tạo share:
  - ☐ Bật password bảo vệ (nhập password → hash lưu)
  - ☐ Đặt ngày hết hạn (date picker, optional)
  - Nút "Revoke" để thu hồi share bất kỳ lúc nào
- Trang share hiển thị: **render sẵn, read-only**, không có UI chỉnh sửa, không cần đăng nhập (trừ khi có password) — layout tối giản, có thể in/export PDF từ trình duyệt.
- Nếu share có password: trang yêu cầu nhập password trước khi hiện nội dung (session cookie riêng cho share đó).
- Nếu hết hạn hoặc bị revoke: hiển thị trang "Link không còn khả dụng".

### 4.8 Tích hợp AI (BYOK)

#### 4.8.1 Cấu hình (Settings UI)
- Form nhập: **API Base URL** (endpoint Azure AI Foundry), **API Key**, **Model/Deployment name**.
- Lưu plain text vào bảng `ai_settings` (đã xác nhận không mã hoá — do single-user + VM riêng).
- Nút "Test connection" gọi 1 request nhỏ để verify key/endpoint hoạt động trước khi lưu.

#### 4.8.2 Auto-tag / Auto-category (on-demand)
- Nút **"Suggest tags"** trên mỗi document (không tự động chạy khi save).
- Gửi nội dung document (hoặc phần đầu nếu quá dài) tới AI, yêu cầu trả về JSON list tag đề xuất + category.
- UI hiển thị tag gợi ý dưới dạng chip có thể click để thêm/bỏ trước khi confirm — không tự động apply.

#### 4.8.3 Dịch nội dung
- Nút **"Translate"** trên document → chọn ngôn ngữ đích (mặc định: Việt ⇄ Anh).
- Kết quả dịch tạo **document mới** (không ghi đè bản gốc), đặt tên `<tên gốc> (EN)` hoặc tương tự, cùng folder, gắn tag gốc + tag "translated".
- Giữ nguyên định dạng Markdown/HTML trong bản dịch.

#### 4.8.4 Error handling AI
- Nếu API key sai/hết quota/endpoint lỗi → hiển thị thông báo lỗi rõ ràng, không crash app, không mất nội dung đang soạn.

---

## 5. Backup & Vận hành

### 5.1 Backup theo lịch
- **Tần suất:** hàng ngày (chạy nền bất đồng bộ trong FastAPI hoặc CLI task).
- **Nội dung backup:** đóng gói toàn bộ database SQLite (`dochub.db`) + toàn bộ thư mục tệp tin `storage/` (documents & assets) thành file nén `dochub_YYYYMMDD_HHMMSS.tar.gz`.
- **Đích lưu backup:** upload tệp nén lên Azure Blob Storage container `dochub-backups`.
- **Retention:** giữ 30 bản gần nhất trên Azure Blob, tự động dọn dẹp các bản cũ hơn.
- **Backup thủ công:** hỗ trợ nút "Backup now" trong Settings UI để trigger backup và đẩy lên Blob ngay tức thì.

### 5.2 Dung lượng
- Toàn bộ dữ liệu sống nằm trên Local Storage của host (thông qua mounted volume `./data`), phụ thuộc vào dung lượng ổ đĩa của VM.
- Không giới hạn kích thước file upload từng asset — chỉ cảnh báo mềm ở FE nếu > 50MB.

### 5.3 Deployment
- **Local Development / Standalone:** Khởi chạy dễ dàng bằng `docker-compose.yml` (hoặc chạy trực tiếp frontend + backend bằng lệnh dev).
- **Production Host:** Triển khai trên host Docker hiện có (`vm-sea-docker-01`), tích hợp qua script `add-docker.sh` để tham gia mạng nội bộ `lab-network` và nhận chứng chỉ SSL tự động qua cụm `nginx-proxy` + `acme-companion`.
- Container naming theo convention: `lab-dochub-app-01`.
- Volume mount: `./data:/app/data` (chứa database SQLite, thư mục `storage/` và `backups/`).

---

## 6. Bảo mật

- Session-based auth, password hash bằng `bcrypt`/`argon2`.
- HTML preview/edit render trong `<iframe sandbox="allow-scripts">` để cách ly triệt để script với ứng dụng chính (tuyệt đối KHÔNG cấp `allow-same-origin`).
- Ngăn chặn triệt để lỗ hổng Path Traversal bằng cơ chế kiểm tra `os.path.abspath` khi đọc/ghi file Local Storage.
- Trang share public: rate-limit nhẹ để tránh brute-force password (nếu có đặt password).
- AI API key lưu plain trong SQLite — **rủi ro đã được chủ động chấp nhận** do môi trường single-user/VM riêng; không expose ra API response nào (mask khi hiển thị lại trong Settings UI, chỉ hiện vài ký tự cuối).

---

## 7. Ngoài phạm vi (Out of scope) — giai đoạn 1
- Multi-user, phân quyền, Azure AD/Entra ID login.
- Real-time collaborative editing (nhiều người sửa cùng lúc).
- Comment/feedback từ người xem trang share.
- Mã hoá API key AI trong DB.
- UI Restore tự động 1-click từ Azure Blob (giai đoạn 1 restore thủ công từ file backup nếu có sự cố).

---

## 8. Các quyết định đã thống nhất (Decisions Confirmed)
| # | Hạng mục | Quyết định đã xác nhận |
|---|---|---|
| 1 | Tên ứng dụng & Subdomain | Tên: **DocHub** (`dochub`), Subdomain production: `dochub.nhant.com` |
| 2 | Chiến lược triển khai | Giữ `docker-compose.yml` phục vụ dev/test; production dùng `add-docker.sh` join `lab-network` |
| 3 | Chính sách sao lưu | Backup hàng ngày nén SQLite + Storage đẩy lên Azure Blob `dochub-backups`, giữ 30 bản gần nhất |
| 4 | Tìm kiếm toàn văn bản | SQLite FTS5 với `tokenize='unicode61 remove_diacritics 0'` bảo toàn dấu tiếng Việt |
| 5 | Bộ công nghệ Frontend | React + Vite + Tailwind CSS + shadcn/ui; Font: **Be Vietnam Pro**; Editor: CodeMirror; Parser: `markdown-it` |
| 6 | Chiến lược lưu trữ | Toàn bộ dữ liệu sống (DB, Docs, Assets) nằm trên Local Storage (`./data`), Blob chỉ dùng cho Backup |

