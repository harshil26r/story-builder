#!/usr/bin/env bash
# Provision a runnable Story Builder environment in a checkout/worktree.
# Creates .env, installs dependencies, and ensures MongoDB is reachable.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

DIR=""
FORCE_ENV=0
NO_INSTALL=0
NO_MONGO=0
GEN_SECRET=0

usage() {
  cat <<'EOF'
Usage: scripts/setup-env.sh [options]

  --dir DIR        Checkout to provision (default: current directory)
  --force-env      Overwrite an existing .env from .env.example (backed up)
  --gen-secret     Replace the placeholder SESSION_SECRET with a random value
  --no-install     Skip `npm install`
  --no-mongo       Skip MongoDB detection/startup
  -h, --help       Show this help

Steps:
  1. Copy .env.example -> .env when missing.
  2. Optionally generate SESSION_SECRET.
  3. npm install (npm workspaces, single root node_modules).
  4. Verify MongoDB reachable at MONGO_URI; try to start it if not.
EOF
}

while (($#)); do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --force-env) FORCE_ENV=1; shift ;;
    --gen-secret) GEN_SECRET=1; shift ;;
    --no-install) NO_INSTALL=1; shift ;;
    --no-mongo) NO_MONGO=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done

if [[ -z "$DIR" ]]; then DIR="$PWD"; fi
[[ -d "$DIR" ]] || die "directory not found: $DIR"
ROOT="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null)" || die "not a git repository: $DIR"
cd "$ROOT"
log "provisioning environment in $ROOT"

# 1. .env ---------------------------------------------------------------------
if [[ "$FORCE_ENV" == 1 && -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env" "$ROOT/.env.bak.$(date +%s)"
  cp "$ROOT/.env.example" "$ROOT/.env"
  ok "recreated .env from .env.example (previous backed up)"
elif [[ -f "$ROOT/.env" ]]; then
  ok ".env already present (use --force-env to reset)"
else
  [[ -f "$ROOT/.env.example" ]] || die ".env.example is missing; cannot create .env"
  cp "$ROOT/.env.example" "$ROOT/.env"
  ok "created .env from .env.example"
fi

# 2. SESSION_SECRET -----------------------------------------------------------
if [[ "$GEN_SECRET" == 1 ]]; then
  require_cmd openssl
  secret="$(openssl rand -hex 32)"
  if grep -qE '^SESSION_SECRET=' "$ROOT/.env"; then
    tmp="$(mktemp)"
    sed -E "s#^SESSION_SECRET=.*#SESSION_SECRET=${secret}#" "$ROOT/.env" >"$tmp"
    mv "$tmp" "$ROOT/.env"
  else
    printf 'SESSION_SECRET=%s\n' "$secret" >>"$ROOT/.env"
  fi
  ok "generated a random SESSION_SECRET"
fi
if [[ "$(env_value SESSION_SECRET "$ROOT/.env")" == "change-me-long-random-string" ]]; then
  warn "SESSION_SECRET is still the placeholder; run with --gen-secret for a dev-safe value"
fi

# 3. dependencies -------------------------------------------------------------
if [[ "$NO_INSTALL" == 0 ]]; then
  require_cmd npm
  log "installing dependencies (npm install)"
  npm install --no-audit --no-fund
  ok "dependencies installed"
else
  log "skipping npm install (--no-install)"
fi

# 3b. install-script policy (npm >= 12 blocks dependency install scripts) -----
if [[ "$NO_INSTALL" == 0 ]] && has_cmd npm; then
  if npm install-scripts ls 2>/dev/null | grep -qi "blocked"; then
    warn "npm blocked install scripts for some dependencies (e.g. bcrypt, esbuild)."
    warn "Approve the project allowlist, then rebuild:"
    warn "  npm install-scripts approve --all && npm rebuild"
  fi
fi

# 4. MongoDB ------------------------------------------------------------------
get_mongo_hostport() {
  local uri hostport host port
  uri="$(env_value MONGO_URI "$ROOT/.env")"
  uri="${uri:-mongodb://127.0.0.1/story-builder}"
  hostport="${uri#mongodb://}"
  hostport="${hostport%%/*}"
  hostport="${hostport##*@}"
  host="${hostport%%:*}"
  port="${hostport##*:}"
  if [[ "$port" == "$host" ]]; then port=27017; fi
  [[ -n "$host" ]] || host=127.0.0.1
  printf '%s %s' "$host" "$port"
}

start_mongo() {
  local host="$1" port="$2" i
  warn "MongoDB not reachable at ${host}:${port}; attempting to start it"
  if [[ -x "$SCRIPT_DIR/mongo-service.sh" ]]; then
    "$SCRIPT_DIR/mongo-service.sh" start >/dev/null 2>&1 || true
  fi
  if port_open "$port" "$host"; then
    ok "MongoDB is up at ${host}:${port}"
    return 0
  fi
  if has_cmd systemctl; then
    systemctl start mongod >/dev/null 2>&1 || true
    systemctl --user start mongod >/dev/null 2>&1 || true
  fi
  if has_cmd brew; then
    brew services start mongodb-community >/dev/null 2>&1 || true
  fi
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    if port_open "$port" "$host"; then
      ok "MongoDB is up at ${host}:${port}"
      return 0
    fi
  done
  return 1
}

if [[ "$NO_MONGO" == 0 ]]; then
  read -r MONGO_HOST MONGO_PORT <<<"$(get_mongo_hostport)"
  if port_open "$MONGO_PORT" "$MONGO_HOST"; then
    ok "MongoDB reachable at ${MONGO_HOST}:${MONGO_PORT}"
  elif ! start_mongo "$MONGO_HOST" "$MONGO_PORT"; then
    die "cannot reach MongoDB at ${MONGO_HOST}:${MONGO_PORT}. Start it manually (e.g. 'sudo systemctl start mongod') or rerun with --no-mongo."
  fi
else
  log "skipping MongoDB checks (--no-mongo)"
fi

ok "environment ready in $ROOT"
