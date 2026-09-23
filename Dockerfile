# ==========================================
# STAGE 1: Build Frontend Bundle
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Python FastAPI Production Runtime
# ==========================================
FROM python:3.11-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Cài đặt thư viện hệ thống tối thiểu
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Sao chép mã nguồn backend
COPY backend/ ./backend/

# Sao chép frontend bundle từ stage 1
COPY --from=frontend-builder /build/dist ./frontend/dist

# Sao chép thư mục scripts
COPY scripts/ ./scripts/

# Tạo các thư mục dữ liệu mặc định
RUN mkdir -p /app/data/storage/documents /app/data/storage/assets /app/data/backups

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
