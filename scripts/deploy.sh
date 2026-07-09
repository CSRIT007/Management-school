#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MAX_WAIT=90

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  red 'Docker is not installed. Install Docker first.'
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  red 'Docker Compose v2 is not available (try: docker compose version).'
  exit 1
fi

if [[ ! -f .env ]]; then
  red 'Missing .env file.'
  echo 'Run:  cp .env.prod.example .env'
  echo 'Then edit .env (POSTGRES_PASSWORD, PUBLIC_URL).'
  exit 1
fi

if grep -q 'change_me_to_a_strong_password' .env 2>/dev/null; then
  red 'Set a strong POSTGRES_PASSWORD in .env before deploying.'
  exit 1
fi

if grep -q 'YOUR_EC2_PUBLIC_IP' .env 2>/dev/null; then
  red 'Set PUBLIC_URL in .env to your EC2 public IP or domain.'
  exit 1
fi

WEB_PORT="$(grep -E '^WEB_PORT=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
WEB_PORT="${WEB_PORT:-80}"
PUBLIC_URL="$(grep -E '^PUBLIC_URL=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
PUBLIC_URL="${PUBLIC_URL:-http://localhost}"

green "Building and starting ($COMPOSE_FILE)..."
docker compose -f "$COMPOSE_FILE" up -d --build

green 'Waiting for API health check...'
elapsed=0
until curl -sf "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null 2>&1; do
  if (( elapsed >= MAX_WAIT )); then
    red "API did not become healthy within ${MAX_WAIT}s."
    echo 'Check logs:  docker compose -f '"$COMPOSE_FILE"' logs api'
    exit 1
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

green 'Deploy complete.'
echo ''
echo "  App URL:  ${PUBLIC_URL}"
echo "  Health:   ${PUBLIC_URL}/api/health"
echo "  Login:    admin@gmail.com / 123456  (change before real use)"
echo ''
echo 'Useful commands:'
echo "  docker compose -f $COMPOSE_FILE ps"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo "  docker compose -f $COMPOSE_FILE down"
