#!/usr/bin/env bash
# Create an isolated git worktree + branch for one issue, then provision it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ISSUE=""
SLUG=""
BASE="main"
NO_SETUP=0

usage() {
  cat <<'EOF'
Usage: scripts/new-worktree.sh <issue-number> [slug] [options]

Creates a worktree for an issue at:
  ${WORKTREE_ROOT:-<repo-parent>/story-builder-worktrees}/issue-<n>
on branch:
  issue/<n>-<slug>

  --base BRANCH    Start point branch (default: main)
  --no-setup       Do not run scripts/setup-env.sh in the new worktree
  -h, --help       Show this help

The worktree root can be overridden with WORKTREE_ROOT.
EOF
}

while (($#)); do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --no-setup) NO_SETUP=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *)
      if [[ -z "$ISSUE" ]]; then
        ISSUE="$1"
      elif [[ -z "$SLUG" ]]; then
        SLUG="$1"
      else
        die "unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

[[ -n "$ISSUE" ]] || {
  usage
  die "issue number is required"
}
[[ "$ISSUE" =~ ^[0-9]+$ ]] || die "issue number must be numeric, got: $ISSUE"

ROOT="$(main_repo_root)"
if [[ -z "$SLUG" ]]; then
  if gh_ready; then
    title="$(gh issue view "$ISSUE" --json title --jq '.title' 2>/dev/null || true)"
    SLUG="$(slugify "$title")"
  fi
  [[ -n "$SLUG" ]] || SLUG="issue"
fi

BRANCH="$(issue_branch "$ISSUE" "$SLUG")"
WT_PATH="$(issue_worktree_path "$ISSUE")"

log "worktree: $WT_PATH"
log "branch:   $BRANCH (base: $BASE)"

git -C "$ROOT" fetch origin --prune >/dev/null 2>&1 || warn "git fetch failed (continuing offline)"
git -C "$ROOT" rev-parse --verify "$BASE" >/dev/null 2>&1 || warn "base branch '$BASE' not found locally"

mkdir -p "$(dirname "$WT_PATH")"

if [[ -d "$WT_PATH/.git" || -f "$WT_PATH/.git" ]]; then
  ok "worktree already exists at $WT_PATH"
elif git -C "$ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git -C "$ROOT" worktree add "$WT_PATH" "$BRANCH"
  ok "attached existing branch $BRANCH"
else
  git -C "$ROOT" worktree add -b "$BRANCH" "$WT_PATH" "$BASE"
  ok "created branch $BRANCH from $BASE"
fi

if [[ "$NO_SETUP" == 0 ]]; then
  "$SCRIPT_DIR/setup-env.sh" --dir "$WT_PATH"
fi

printf '\n'
ok "ready: $WT_PATH"
printf '   cd %q\n' "$WT_PATH"
