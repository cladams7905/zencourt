#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/apps/video-server/docker-compose.yml"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "[ngrok] The ngrok CLI is required. Install it from https://ngrok.com/download and ensure it is on your PATH." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[ngrok] curl is required to query the local ngrok API." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ngrok] python3 is required to parse ngrok tunnel metadata." >&2
  exit 1
fi

ENV_FILE="${REPO_ROOT}/.env.local"
if [[ -f "${ENV_FILE}" ]]; then
  echo "[env] Loading ${ENV_FILE}"
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
else
  echo "[env] ${ENV_FILE} not found; ensure required variables are exported manually." >&2
fi

NGROK_LOG="$(mktemp -t ngrok-log.XXXXXX)"

cleanup() {
  if [[ -n "${NGROK_PID:-}" ]]; then
    kill "${NGROK_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${NGROK_LOG}"
}
trap cleanup EXIT INT TERM

echo "[ngrok] Starting tunnel on http://localhost:3001 ..."
ngrok http 3001 --log=stdout >"${NGROK_LOG}" 2>&1 &
NGROK_PID=$!

TUNNEL_URL=""
for attempt in {1..30}; do
  sleep 1
  RESPONSE="$(curl -sf http://127.0.0.1:4040/api/tunnels || true)"
  if [[ -z "${RESPONSE}" ]]; then
    continue
  fi
  TUNNEL_URL="$(
    python3 - <<'PY' "${RESPONSE}"
import json, sys
data = json.loads(sys.argv[1])
for tunnel in data.get("tunnels", []):
    if tunnel.get("proto") == "https":
        print(tunnel.get("public_url", ""))
        sys.exit(0)
sys.exit(1)
PY
  )" || true
  if [[ -n "${TUNNEL_URL}" ]]; then
    break
  fi
done

if [[ -z "${TUNNEL_URL}" ]]; then
  echo "[ngrok] Failed to detect public tunnel URL. Recent ngrok log output:" >&2
  if [[ -s "${NGROK_LOG}" ]]; then
    tail -n 40 "${NGROK_LOG}" >&2 || true
  else
    echo "(ngrok log was empty)" >&2
  fi
  exit 1
fi

FAL_WEBHOOK_URL="${TUNNEL_URL%/}/webhooks/fal"
echo "[ngrok] Tunnel ready: ${FAL_WEBHOOK_URL}"

export FAL_WEBHOOK_URL

if [[ $# -eq 0 ]]; then
  set -- up
fi

echo "[docker-compose] Starting video server with tunnel..."
(
  cd "${REPO_ROOT}" && FAL_WEBHOOK_URL="${FAL_WEBHOOK_URL}" docker compose -f "${COMPOSE_FILE}" "$@"
)
