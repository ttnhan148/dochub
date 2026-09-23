# CLAUDE.md — Claude Code Guidelines for DocHub

> **Universal Context:** Always read [AGENTS.md](AGENTS.md) and [docs/PROGRESS.md](docs/PROGRESS.md) before starting any task.

## Project Overview
DocHub is a lightweight, zero-bloat personal Markdown/HTML knowledge base and presentation web app.
- **Backend:** FastAPI (Python 3.11+), SQLite3 + FTS5 (raw SQL, NO heavy ORMs).
- **Primary Storage:** Local Filesystem (`/app/data/storage/` in Docker, `./data/storage/` in local dev).
- **Remote Backup:** Azure Blob Storage (`dochub-backups` container only).
- **Frontend:** React 18+ (Vite, TypeScript), Tailwind CSS, shadcn/ui components, **Be Vietnam Pro** font (sans), **JetBrains Mono** (mono).
- **AI:** Azure AI Foundry BYOK (OpenAI-compatible endpoints).

## Key Commands
- **Backend Run:** `cd backend && uvicorn main:app --reload --port 8000` (hoặc `python -m uvicorn main:app --reload --port 8000`)
- **Frontend Run:** `cd frontend && npm run dev`
- **Frontend Build:** `cd frontend && npm run build`
- **Generate Password Hash:** `python scripts/hash_password.py <password>`

## Invariant Rules
1. **Never use Azure Blob for live data:** Documents and assets are stored in local files. Blob is exclusively for backup archives.
2. **Never install an ORM:** Use raw SQL / `sqlite3` / `aiosqlite`. Always use `get_db_connection()` helper from `backend.db` which enforces WAL mode and `PRAGMA foreign_keys = ON;`.
3. **Always use font "Be Vietnam Pro"** for main UI and reading views, and `JetBrains Mono` for code.
4. **Always isolate HTML preview:** Render user-supplied HTML in `<iframe sandbox="allow-scripts">`. **NEVER add `allow-same-origin`** to the iframe sandbox attributes (prevents XSS against session cookies).
5. **Path Traversal Protection:** Always validate paths in `backend/storage.py` using `_resolve_safe_path`.
6. **Update progress:** Always update `docs/PROGRESS.md` before finishing a turn.
