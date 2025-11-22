#!/usr/bin/env bash

set -euo pipefail

IMAGE="${1:-${GHCR_IMAGE:-ghcr.io/example/zencourt-video-server:latest}}"
CONTAINER_NAME="${CONTAINER_NAME:-zencourt-video-server}"
ENV_FILE="${ENV_FILE:-/home/deploy/.env.video-server}"
DATA_DIR="${DATA_DIR:-/tmp/video-processing}"
PORT="${PORT:-3001}"

echo "[deploy] Using image: ${IMAGE}"
echo "[deploy] Container name: ${CONTAINER_NAME}"
echo "[deploy] Env file: ${ENV_FILE}"
echo "[deploy] Data dir: ${DATA_DIR}"
echo "[deploy] Port: ${PORT}"

docker login ghcr.io -u "${GHCR_USERNAME:-$USER}" -p "${GHCR_TOKEN:?GHCR_TOKEN is required for docker login}"
docker pull "${IMAGE}"

docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true

mkdir -p "${DATA_DIR}"

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${PORT}:3001" \
  --env-file "${ENV_FILE}" \
  -v "${DATA_DIR}":/tmp/video-processing \
  "${IMAGE}"

echo "[deploy] Deployment complete. Tail logs with: docker logs -f ${CONTAINER_NAME}"
