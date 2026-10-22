#!/usr/bin/env bash
# Thin dispatcher for the Story Builder issue workflow scripts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Story Builder workflow

Usage: scripts/workflow.sh <command> [args...]

  setup     [args]   scripts/setup-env.sh        provision env (.env, deps, mongo)
  worktree  [args]   scripts/new-worktree.sh     create issue worktree + branch
  new       [args]   scripts/issue-new.sh        create a numbered GitHub issue
  ack       [args]   scripts/issue-ack.sh        claim issue + create worktree
  test      [args]   scripts/issue-test.sh       test + typecheck + lint
  review    [args]   scripts/issue-review.sh     independent review (Gemini 3.8)
  pr        [args]   scripts/pr-create.sh        push branch + open PR
  merge     [args]   scripts/pr-merge.sh         merge PR into main (human-run)
  mongo     [args]   scripts/mongo-service.sh    start, stop, status, logs for MongoDB
  run       [args]   scripts/run-issue.sh        full lifecycle for one issue
  next      [args]   scripts/run-issue.sh --next next open issue, full lifecycle
  help               Show this help

Run any command with -h for its own options.
EOF
}

cmd="${1:-help}"
if (($#)); then shift; fi

case "$cmd" in
  setup) exec "$SCRIPT_DIR/setup-env.sh" "$@" ;;
  worktree) exec "$SCRIPT_DIR/new-worktree.sh" "$@" ;;
  new) exec "$SCRIPT_DIR/issue-new.sh" "$@" ;;
  ack) exec "$SCRIPT_DIR/issue-ack.sh" "$@" ;;
  test) exec "$SCRIPT_DIR/issue-test.sh" "$@" ;;
  review) exec "$SCRIPT_DIR/issue-review.sh" "$@" ;;
  pr) exec "$SCRIPT_DIR/pr-create.sh" "$@" ;;
  merge) exec "$SCRIPT_DIR/pr-merge.sh" "$@" ;;
  mongo) exec "$SCRIPT_DIR/mongo-service.sh" "$@" ;;
  run) exec "$SCRIPT_DIR/run-issue.sh" "$@" ;;
  next) exec "$SCRIPT_DIR/run-issue.sh" --next "$@" ;;
  help | -h | --help) usage ;;
  *) usage; die "unknown command: $cmd" ;;
esac
