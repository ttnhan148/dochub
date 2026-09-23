#!/usr/bin/env bash
# ==============================================================================
# DocHub - Production Deployment Script (AzureLab Topology)
# Host: vm-sea-docker-01
# Container Name: lab-dochub-app-01
# Domain: dochub.nhant.com (fallback: dochub.nhan.dedyn.io)
# Network: lab-network (Reverse Proxy: nginx-proxy + acme-companion)
# ==============================================================================

set -euo pipefail

APP_NAME="dochub"
CONTAINER_NAME="lab-dochub-app-01"
NETWORK_NAME="lab-network"
PRIMARY_HOST="dochub.nhant.com,dochub.nhan.dedyn.io"
LETSENCRYPT_EMAIL="admin@nhant.com"
APP_DIR="/opt/docker/apps/${APP_NAME}"

echo "=== [1/4] Kiểm tra thư mục và cấu hình ==="
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "[-] Không tìm thấy ${APP_DIR}/.env. Vui lòng tạo tệp .env từ .env.example."
    exit 1
fi

mkdir -p "${APP_DIR}/data/storage/documents"
mkdir -p "${APP_DIR}/data/storage/assets"
mkdir -p "${APP_DIR}/data/backups"

echo "=== [2/4] Xây dựng Docker image cho ${APP_NAME} ==="
cd "${APP_DIR}"
docker build -t "${APP_NAME}:latest" -f Dockerfile .

echo "=== [3/4] Dừng và dọn container cũ nếu đang chạy ==="
if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    echo "[*] Dừng container ${CONTAINER_NAME}..."
    docker stop "${CONTAINER_NAME}" || true
    docker rm "${CONTAINER_NAME}" || true
fi

echo "=== [4/4] Khởi chạy container mới tham gia ${NETWORK_NAME} ==="
docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    --network "${NETWORK_NAME}" \
    --env-file "${APP_DIR}/.env" \
    -e VIRTUAL_HOST="${PRIMARY_HOST}" \
    -e LETSENCRYPT_HOST="${PRIMARY_HOST}" \
    -e LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL}" \
    -e VIRTUAL_PORT=8000 \
    -e DB_PATH=/app/data/dochub.db \
    -e STORAGE_PATH=/app/data/storage \
    -e BACKUP_STAGING_PATH=/app/data/backups \
    -v "${APP_DIR}/data:/app/data" \
    "${APP_NAME}:latest"

echo "=== [DONE] Triển khai ${APP_NAME} thành công! ==="
docker ps --filter "name=${CONTAINER_NAME}"
