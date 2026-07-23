#!/usr/bin/env bash
#
# run.sh — start the whole ADCET Alumni stack in one command.
#
#   ./run.sh              start docker (postgres + minio), backend :4000, frontend :8080
#   ./run.sh --seed       ...and run the idempotent dev seed first
#   ./run.sh --reset      ...and wipe + re-migrate + reseed the database (DESTRUCTIVE)
#   ./run.sh --no-docker  assume postgres/minio are already running elsewhere
#   ./run.sh --stop       stop the docker services and exit
#   ./run.sh --help       this text
#
# Ctrl-C stops the backend and frontend. Docker keeps running so the next start
# is fast — use `./run.sh --stop` when you want the containers down too.

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
COMPOSE_FILE="$BACKEND/docker-compose.yml"

# Ports, kept in sync with backend/.env.development and vite.config.ts.
API_PORT=4000
WEB_PORT=8080
DB_PORT=5433
MINIO_PORT=9000

DO_DOCKER=1
DO_SEED=0
DO_RESET=0

# ── pretty output ────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi

step() { printf "%s==>%s %s\n" "$BLUE$BOLD" "$RESET$BOLD" "$*$RESET"; }
info() { printf "    %s\n" "$DIM$*$RESET"; }
ok()   { printf "    %s✔%s %s\n" "$GREEN" "$RESET" "$*"; }
warn() { printf "    %s!%s %s\n" "$YELLOW" "$RESET" "$*"; }
die()  { printf "%serror:%s %s\n" "$RED$BOLD" "$RESET" "$*" >&2; exit 1; }

# Prints the comment banner at the top of this file (everything after the
# shebang, up to the first blank line).
usage() {
  awk 'NR > 1 { if (!/^#/) exit; sub(/^# ?/, ""); print }' "${BASH_SOURCE[0]}"
  exit 0
}

# ── args ─────────────────────────────────────────────────────────────────────
STOP_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --seed)      DO_SEED=1 ;;
    --reset)     DO_RESET=1 ;;
    --no-docker) DO_DOCKER=0 ;;
    --stop)      STOP_ONLY=1 ;;
    -h|--help)   usage ;;
    *)           die "unknown option: $arg (try --help)" ;;
  esac
done

# ── docker compose: v2 plugin or the standalone binary, whichever exists ─────
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" "$@"
  else
    die "neither 'docker compose' nor 'docker-compose' is available"
  fi
}

if [ "$STOP_ONLY" -eq 1 ]; then
  step "Stopping docker services"
  compose stop
  ok "postgres and minio stopped"
  exit 0
fi

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

# ── 1. preflight ─────────────────────────────────────────────────────────────
step "Checking prerequisites"
command -v node >/dev/null || die "node is not installed"
command -v npm  >/dev/null || die "npm is not installed"
[ -f "$BACKEND/.env.development" ] || \
  die "backend/.env.development is missing — copy backend/.env.example and fill it in"
[ -f "$ROOT/.env" ] || warn "root .env is missing; the frontend will fall back to http://localhost:4000/api/v1"
ok "node $(node -v)"

for p in "$API_PORT:backend" "$WEB_PORT:frontend"; do
  if port_busy "${p%%:*}"; then
    die "port ${p%%:*} is already in use (${p##*:}) — stop the other process first"
  fi
done

# ── 2. dependencies ──────────────────────────────────────────────────────────
step "Installing dependencies"
if [ ! -d "$ROOT/node_modules" ]; then
  info "frontend: npm install"
  (cd "$ROOT" && npm install)
else
  ok "frontend: node_modules present"
fi
if [ ! -d "$BACKEND/node_modules" ]; then
  info "backend: npm install"
  (cd "$BACKEND" && npm install)
else
  ok "backend: node_modules present"
fi

# ── 3. infrastructure ────────────────────────────────────────────────────────
if [ "$DO_DOCKER" -eq 1 ]; then
  step "Starting Postgres and MinIO"
  docker info >/dev/null 2>&1 || die "the docker daemon is not reachable — is Docker running?"
  compose up -d

  # `createbuckets` is a one-shot job; only the long-lived services need polling.
  info "waiting for postgres on :$DB_PORT ..."
  for _ in $(seq 1 60); do
    port_busy "$DB_PORT" && break
    sleep 1
  done
  port_busy "$DB_PORT" || die "postgres did not come up on :$DB_PORT"
  ok "postgres ready"

  info "waiting for minio on :$MINIO_PORT ..."
  for _ in $(seq 1 60); do
    port_busy "$MINIO_PORT" && break
    sleep 1
  done
  port_busy "$MINIO_PORT" || die "minio did not come up on :$MINIO_PORT"
  ok "minio ready"
else
  warn "skipping docker (--no-docker); expecting postgres on :$DB_PORT and minio on :$MINIO_PORT"
fi

# ── 4. database ──────────────────────────────────────────────────────────────
step "Preparing the database"
cd "$BACKEND"
npm run prisma:generate --silent
ok "prisma client generated"

if [ "$DO_RESET" -eq 1 ]; then
  warn "--reset: dropping and rebuilding the database"
  npm run db:reset
  ok "database reset and reseeded"
else
  npm run prisma:deploy --silent
  ok "migrations applied"
  if [ "$DO_SEED" -eq 1 ]; then
    npm run seed
    ok "seed complete"
  fi
fi
cd "$ROOT"

# ── 5. app processes ─────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

shutdown() {
  trap - INT TERM EXIT
  echo
  step "Shutting down"
  # Kill the whole process group of each child: `npm run dev` spawns tsx/vite
  # underneath, and killing only the npm wrapper would orphan them.
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    [ -n "$pid" ] || continue
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait "$FRONTEND_PID" "$BACKEND_PID" 2>/dev/null || true
  ok "backend and frontend stopped"
  [ "$DO_DOCKER" -eq 1 ] && info "docker is still running — './run.sh --stop' to stop it"
  exit 0
}
trap shutdown INT TERM

step "Starting the apps"
# setsid puts each child in its own process group so shutdown() can take out the
# whole tree in one signal.
( cd "$BACKEND" && exec setsid npm run dev ) &
BACKEND_PID=$!
( cd "$ROOT"    && exec setsid npm run dev ) &
FRONTEND_PID=$!

info "waiting for the API to answer ..."
API_UP=0
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:$API_PORT/api/v1/health" >/dev/null 2>&1; then API_UP=1; break; fi
  kill -0 "$BACKEND_PID" 2>/dev/null || break
  sleep 1
done
if [ "$API_UP" -eq 1 ]; then
  ok "api healthy"
else
  warn "api did not answer /api/v1/health yet — check the log above"
fi

cat <<EOF

${BOLD}ADCET Alumni is running${RESET}
  ${BOLD}Frontend${RESET}    http://localhost:$WEB_PORT
  ${BOLD}API${RESET}         http://localhost:$API_PORT/api/v1
  ${BOLD}Swagger${RESET}     http://localhost:$API_PORT/api/docs
  ${BOLD}MinIO${RESET}       http://localhost:9001  ${DIM}(minioadmin / minioadmin)${RESET}
  ${BOLD}Postgres${RESET}    localhost:$DB_PORT     ${DIM}(adcet / adcet / adcet_alumni)${RESET}

  ${DIM}Seeded login: admin@adcet.in / Admin@12345 · alice@adcet.in / Alumni@123${RESET}
  ${DIM}Press Ctrl-C to stop.${RESET}

EOF

# Exit as soon as either app dies, so a crashed backend doesn't leave a
# half-running stack looking healthy.
wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
warn "one of the apps exited"
shutdown
