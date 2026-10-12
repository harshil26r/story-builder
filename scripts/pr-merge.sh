#!/usr/bin/env bash
# Merge a reviewed pull request into the base branch and clean up the worktree.
# This is intentionally human-run and requires --yes to act.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

TARGET=""
METHOD="squash"
YES=0
KEEP_WORKTREE=0
DELETE_BRANCH=1

usage() {
  cat <<'EOF'
Usage: scripts/pr-merge.sh <issue-number|pr-number|pr-url> [options]

  --method M        squash | merge | rebase (default: squash)
  --keep-worktree   Do not remove the issue worktree after merging
  --keep-branch     Do not delete the remote branch
  --yes             Required: actually perform the merge
  -h, --help        Show this help

Before merging it prints the PR checks. On success it fast-forwards local
`main` and removes the issue worktree.
EOF
}

while (($#)); do
  case "$1" in
    --method) METHOD="$2"; shift 2 ;;
    --keep-worktree) KEEP_WORKTREE=1; shift ;;
    --keep-branch) DELETE_BRANCH=0; shift ;;
    --yes) YES=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *)
      if [[ -z "$TARGET" ]]; then TARGET="$1"; else die "unexpected argument: $1"; fi
      shift
      ;;
  esac
done

[[ -n "$TARGET" ]] || {
  usage
  die "issue/PR number or URL is required"
}
case "$METHOD" in
  squash | merge | rebase) ;;
  *) die "invalid --method '$METHOD'" ;;
esac
require_gh_auth

ROOT="$(main_repo_root)"

# Resolve the PR number.
if [[ "$TARGET" =~ ^https?:// ]]; then
  pr="${TARGET##*/}"
  issue_hint="$(basename "$(dirname "$TARGET")" 2>/dev/null || true)"
elif [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  pr="$TARGET"
else
  die "unrecognised target: $TARGET"
fi

log "PR #$pr checks:"
gh pr checks "$pr" || warn "no checks configured / checks not all green"

if [[ "$YES" != 1 ]]; then
  warn "dry run: pass --yes to actually merge PR #$pr into the base branch"
  exit 0
fi

merge_args=(pr merge "$pr" --"$METHOD")
if [[ "$DELETE_BRANCH" == 1 ]]; then merge_args+=(--delete-branch); fi
gh "${merge_args[@]}"
ok "merged PR #$pr"

# Fast-forward local main.
base="$(git -C "$ROOT" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
base="${base:-main}"
current="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
if [[ "$current" == "$base" ]]; then
  git -C "$ROOT" pull --ff-only origin "$base" >/dev/null 2>&1 || warn "could not fast-forward $base; pull manually"
  ok "updated local $base"
fi

# Best-effort worktree cleanup for issue-numbered targets.
if [[ "$TARGET" =~ ^[0-9]+$ && "$KEEP_WORKTREE" == 0 ]]; then
  wt="$(issue_worktree_path "$TARGET")"
  if [[ -d "$wt" ]]; then
    git -C "$ROOT" worktree remove "$wt" --force >/dev/null 2>&1 && ok "removed worktree $wt" || warn "could not remove worktree $wt"
  fi
fi

ok "done"
