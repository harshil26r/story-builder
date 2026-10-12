#!/usr/bin/env bash
# Run the full verification suite for a checkout: tests, typecheck, lint, build.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

DIR="$PWD"
FULL=0

usage() {
  cat <<'EOF'
Usage: scripts/issue-test.sh [options]

  --dir DIR   Checkout to test (default: current directory)
  --full      Also run `npm run build`
  -h, --help  Show this help

Runs npm test, npm run typecheck and npm run lint; exits non-zero if any fail.
EOF
}

while (($#)); do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --full) FULL=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

ROOT="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null)" || die "not a git repository: $DIR"
require_cmd npm

failed=0
run_step() {
  local name="$1"
  shift
  log "▶ $name"
  if (cd "$ROOT" && "$@"); then
    ok "$name"
  else
    err "$name failed"
    failed=$((failed + 1))
  fi
}

run_step "npm test" npm test
run_step "npm run typecheck" npm run typecheck
run_step "npm run lint" npm run lint
if [[ "$FULL" == 1 ]]; then
  run_step "npm run build" npm run build
fi

if [[ "$failed" -gt 0 ]]; then
  die "$failed verification step(s) failed"
fi
ok "all verification steps passed"
