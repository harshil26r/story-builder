#!/usr/bin/env bash
# Acknowledge an issue: claim it, mark in-progress, comment, and open a worktree.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ISSUE=""
NO_WORKTREE=0

usage() {
  cat <<'EOF'
Usage: scripts/issue-ack.sh <issue-number> [options]

  1. Assigns the issue to you and labels it `status:in-progress`.
  2. Posts an acknowledgement comment.
  3. Creates the issue worktree (scripts/new-worktree.sh).

Options:
  --no-worktree   Skip worktree creation
  -h, --help      Show this help
EOF
}

while (($#)); do
  case "$1" in
    --no-worktree) NO_WORKTREE=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *)
      if [[ -z "$ISSUE" ]]; then ISSUE="$1"; else die "unexpected argument: $1"; fi
      shift
      ;;
  esac
done

[[ "$ISSUE" =~ ^[0-9]+$ ]] || {
  usage
  die "a numeric issue number is required"
}
require_gh_auth
ensure_workflow_labels

ROOT="$(main_repo_root)"
title="$(gh issue view "$ISSUE" --json title --jq '.title' 2>/dev/null || true)"
[[ -n "$title" ]] || die "issue #$ISSUE not found"

state="$(gh issue view "$ISSUE" --json state --jq '.state')"
[[ "$state" == "OPEN" ]] || die "issue #$ISSUE is $state, not OPEN"

me="$(gh api user --jq '.login' 2>/dev/null || echo '@me')"
gh issue edit "$ISSUE" --add-assignee @me --add-label "status:in-progress" >/dev/null
ok "assigned #$ISSUE to @$me and marked status:in-progress"

branch="$(issue_branch "$ISSUE" "$(slugify "$title")")"
gh issue comment "$ISSUE" --body "Acknowledged — starting work.

- Assignee: @$me
- Branch: \`$branch\`
- Flow: implement (TDD) → test → independent review (Gemini 3.8) → PR → merge" >/dev/null
ok "posted acknowledgement comment"

state_set "$ROOT" "$ISSUE" title "$title"
state_set "$ROOT" "$ISSUE" branch "$branch"
state_set "$ROOT" "$ISSUE" worktree "$(issue_worktree_path "$ISSUE")"
state_set "$ROOT" "$ISSUE" status acknowledged

if [[ "$NO_WORKTREE" == 0 ]]; then
  "$SCRIPT_DIR/new-worktree.sh" "$ISSUE" "$(slugify "$title")"
else
  log "skipping worktree creation (--no-worktree)"
fi

ok "issue #$ISSUE acknowledged"
