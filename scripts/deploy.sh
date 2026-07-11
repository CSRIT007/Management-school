#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MAX_WAIT=120

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$*"; }

show_api_logs() {
  echo ''
  yellow '--- API logs (last 40 lines) ---'
  docker compose -f "$COMPOSE_FILE" logs api --tail 40 2>/dev/null || true
  echo ''
  yellow '--- Web logs (last 15 lines) ---'
  docker compose -f "$COMPOSE_FILE" logs web --tail 15 2>/dev/null || true
  echo ''
}

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

if grep -E '^DATABASE_URL=' .env 2>/dev/null | grep -q '@localhost'; then
  red 'DATABASE_URL must use host "db", not "localhost".'
  echo 'Example: DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db:5432/management_school'
  exit 1
fi

POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
if [[ -n "$POSTGRES_PASSWORD" && -n "$DATABASE_URL" && "$DATABASE_URL" != *"$POSTGRES_PASSWORD"* ]]; then
  yellow 'Warning: POSTGRES_PASSWORD does not appear inside DATABASE_URL.'
  yellow 'If the API fails, make both passwords match exactly.'
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
    docker compose -f "$COMPOSE_FILE" ps || true
    show_api_logs
    red 'Common fixes on EC2:'
    echo '  1. DATABASE_URL must be: postgresql://postgres:PASSWORD@db:5432/management_school'
    echo '  2. POSTGRES_PASSWORD must match the password inside DATABASE_URL'
    echo '  3. If password was changed after first deploy, reset DB volume:'
    echo '       docker compose -f '"$COMPOSE_FILE"' down -v'
    echo '       ./scripts/deploy.sh'
  echo '  4. Port 80 in use? Check: sudo ss -tlnp | grep :80'
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
echo "  docker compose -f $COMPOSE_FILE logs -f api"
echo "  docker compose -f $COMPOSE_FILE down"
