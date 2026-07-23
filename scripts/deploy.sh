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
  yellow '--- API logs (last 50 lines) ---'
  docker compose -f "$COMPOSE_FILE" logs api --tail 50 2>/dev/null || true
  echo ''
  yellow '--- DB logs (last 20 lines) ---'
  docker compose -f "$COMPOSE_FILE" logs db --tail 20 2>/dev/null || true
  echo ''
  yellow '--- Web logs (last 15 lines) ---'
  docker compose -f "$COMPOSE_FILE" logs web --tail 15 2>/dev/null || true
  echo ''
}

diagnose_dns() {
  echo ''
  yellow '--- DNS / DB connectivity check (api → db) ---'
  if docker compose -f "$COMPOSE_FILE" ps --status running api >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" exec -T api node -e "
      import dns from 'dns';
      import { promisify } from 'util';
      const lookup = promisify(dns.lookup);
      try {
        const r = await lookup('db');
        console.log('db resolves to', r.address);
      } catch (e) {
        console.error('DNS FAIL for host \"db\":', e.message);
        console.error('This usually means DATABASE_URL host is wrong, or api is not on the Compose network.');
      }
    " 2>/dev/null || yellow 'Could not exec into api container (may still be starting).'
  else
    yellow 'API container is not running yet.'
  fi
  echo ''
}

urlencode() {
  # Prefer node (always available with this project / on most EC2 images after install)
  if command -v node >/dev/null 2>&1; then
    node -e 'process.stdout.write(encodeURIComponent(process.argv[1] || ""))' "$1"
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
    return
  fi
  # Fallback: only safe if password has no URL-reserved chars
  printf '%s' "$1"
}

env_get() {
  local key="$1"
  grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true
}

env_set() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" .env 2>/dev/null; then
    # Avoid sed delimiter clashes — rewrite file via awk
    awk -v k="$key" -v v="$value" '
      BEGIN { done=0 }
      index($0, k "=") == 1 && !done { print k "=" v; done=1; next }
      { print }
      END { if (!done) print k "=" v }
    ' .env > .env.tmp && mv .env.tmp .env
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
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

POSTGRES_USER="$(env_get POSTGRES_USER)"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="$(env_get POSTGRES_DB)"
POSTGRES_DB="${POSTGRES_DB:-management_school}"
POSTGRES_PASSWORD="$(env_get POSTGRES_PASSWORD)"

if [[ -z "$POSTGRES_PASSWORD" ]]; then
  red 'POSTGRES_PASSWORD is missing in .env'
  exit 1
fi

# Always rebuild DATABASE_URL for Docker networking:
# - host MUST be "db" (Compose service name) — localhost/DNS names break inside containers
# - password MUST be URL-encoded or characters like @ # / : look like a DNS / host error
ENC_PASS="$(urlencode "$POSTGRES_PASSWORD")"
DATABASE_URL="postgresql://${POSTGRES_USER}:${ENC_PASS}@db:5432/${POSTGRES_DB}"
env_set DATABASE_URL "$DATABASE_URL"
export DATABASE_URL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB

green "Synced DATABASE_URL → postgresql://${POSTGRES_USER}:***@db:5432/${POSTGRES_DB}"

WEB_PORT="$(env_get WEB_PORT)"
WEB_PORT="${WEB_PORT:-80}"
PUBLIC_URL="$(env_get PUBLIC_URL)"
PUBLIC_URL="${PUBLIC_URL:-http://localhost}"
export WEB_PORT PUBLIC_URL

# Port already taken?
if command -v ss >/dev/null 2>&1; then
  if ss -tlnp 2>/dev/null | grep -qE ":${WEB_PORT}\\b"; then
    # Only warn if our web container is not the one listening
    if ! docker compose -f "$COMPOSE_FILE" ps --status running web >/dev/null 2>&1; then
      yellow "Warning: something is already listening on port ${WEB_PORT}."
      yellow "Check: sudo ss -tlnp | grep :${WEB_PORT}"
    fi
  fi
fi

green "Building and starting ($COMPOSE_FILE)..."
# Pull base images first — reduces flaky "DNS / no such host" during build on EC2
docker compose -f "$COMPOSE_FILE" pull db 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" up -d --build

green 'Waiting for API health check...'
elapsed=0
until curl -sf "http://127.0.0.1:${WEB_PORT}/api/health" >/dev/null 2>&1; do
  if (( elapsed >= MAX_WAIT )); then
    red "API did not become healthy within ${MAX_WAIT}s."
    docker compose -f "$COMPOSE_FILE" ps || true
    show_api_logs
    diagnose_dns
    red 'Common fixes on EC2:'
    echo '  1. DATABASE_URL is auto-set by this script to: postgresql://USER:PASSWORD@db:5432/DB'
    echo '     (host must be "db", never localhost or your public domain)'
    echo '  2. POSTGRES_PASSWORD must match the password Postgres was first initialized with'
    echo '  3. If password was changed after first deploy, reset DB volume:'
    echo "       docker compose -f $COMPOSE_FILE down -v"
    echo '       ./scripts/deploy.sh'
    echo "  4. Port ${WEB_PORT} in use? Check: sudo ss -tlnp | grep :${WEB_PORT}"
    echo '  5. DNS error for host "db"? Containers must share the Compose network (redeploy with this script).'
    echo '  6. DNS error pulling images? Retry: docker pull postgres:16-alpine && docker pull node:22-alpine'
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
