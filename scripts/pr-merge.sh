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
ISSUE_OVERRIDE=""

usage() {
  cat <<'EOF'
Usage: scripts/pr-merge.sh <issue-number|pr-number|pr-url> [options]

  --method M        squash | merge | rebase (default: squash)
  --issue N         Explicit issue number for worktree cleanup (default: derive
                    from the PR head branch, e.g. issue/<n>-<slug>)
  --keep-worktree   Do not remove the issue worktree after merging
  --keep-branch     Do not delete the remote branch
  --yes             Required: actually perform the merge
  -h, --help        Show this help

Before merging it prints the PR checks. On success it fast-forwards local
`main` and removes the worktree of the issue the PR was opened for. The numeric
argument is always the PR number; the issue is derived from the head branch.
EOF
}

while (($#)); do
  case "$1" in
    --method) METHOD="$2"; shift 2 ;;
    --issue) ISSUE_OVERRIDE="$2"; shift 2 ;;
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
require_cmd node

ROOT="$(main_repo_root)"

# Resolve the PR number. The numeric argument is ALWAYS a PR number; the issue
# number (used for worktree cleanup) is a different sequence, so derive it from
# the PR head branch below.
if [[ "$TARGET" =~ ^https?:// ]]; then
  pr="${TARGET##*/}"
elif [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  pr="$TARGET"
else
  die "unrecognised target: $TARGET"
fi

# Derive the issue number (issue/<n>-<slug>) so cleanup targets the right tree.
issue_num="$ISSUE_OVERRIDE"
head_branch=""
if [[ -z "$issue_num" ]]; then
  head_branch="$(gh pr view "$pr" --json headRefName --jq '.headRefName' 2>/dev/null || true)"
  derived_issue="$(node "$SCRIPT_DIR/lib/branch.mjs" "$head_branch" 2>/dev/null || true)"
  [[ -n "$derived_issue" ]] && issue_num="$derived_issue"
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

# Best-effort worktree cleanup for the issue this PR was opened for.
if [[ "$KEEP_WORKTREE" == 0 ]]; then
  if [[ -n "$issue_num" ]]; then
    wt="$(issue_worktree_path "$issue_num")"
    if [[ -d "$wt" ]]; then
      git -C "$ROOT" worktree remove "$wt" --force >/dev/null 2>&1 && ok "removed worktree $wt" || warn "could not remove worktree $wt"
    else
      log "no worktree at $wt for issue #$issue_num"
    fi
  else
    warn "could not derive issue number from PR #$pr (head: ${head_branch:-unknown}); pass --issue <n> to clean up its worktree"
  fi
fi

ok "done"
