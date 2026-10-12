#!/usr/bin/env bash
# Orchestrate the full per-issue lifecycle:
#   ack -> implement -> test -> review(Gemini 3.8) -> PR -> (human) merge
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ISSUE=""
NEXT=0
FROM="ack"
TO="pr"
AUTO=0
YES=0
DO_MERGE=0

STEPS=(ack implement test review pr merge)

usage() {
  cat <<'EOF'
Usage: scripts/run-issue.sh <issue-number> [options]
       scripts/run-issue.sh --next [options]

Runs the standard Story Builder issue flow. Slack/stop with --from / --to.

Options:
  --next            Use the oldest open GitHub issue
  --from STEP       Start at STEP (ack|implement|test|review|pr|merge)
  --to STEP         Stop after STEP (default: pr)
  --to merge        Also merge (requires --yes)
  --auto            Run the implement + review stages non-interactively
  --yes             Allow the merge stage to act
  -h, --help        Show this help

STEP meanings:
  ack        claim issue, label in-progress, create worktree
  implement  run the `issue-implementer` agent (or print instructions)
  test       npm test + typecheck + lint
  review     independent review by the `issue-reviewer` agent (read-only)
  pr         push branch, open PR with generated description
  merge      merge into base, fast-forward main, remove worktree
EOF
}

while (($#)); do
  case "$1" in
    --next) NEXT=1; shift ;;
    --from) FROM="$2"; shift 2 ;;
    --to) TO="$2"; shift 2 ;;
    --auto) AUTO=1; shift ;;
    --yes) YES=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *)
      if [[ -z "$ISSUE" ]]; then ISSUE="$1"; else die "unexpected argument: $1"; fi
      shift
      ;;
  esac
done

ROOT="$(main_repo_root)"

if [[ "$NEXT" == 1 ]]; then
  require_gh_auth
  ISSUE="$(gh issue list --state open --limit 1 --json number --jq '.[0].number' 2>/dev/null || true)"
  [[ -n "$ISSUE" ]] || die "no open issues found"
  log "selected next issue #$ISSUE"
fi

[[ "$ISSUE" =~ ^[0-9]+$ ]] || {
  usage
  die "an issue number or --next is required"
}
require_gh_auth
if [[ "$TO" == "merge" ]]; then DO_MERGE=1; fi

idx_of() {
  local target="$1" i
  for i in "${!STEPS[@]}"; do
    if [[ "${STEPS[$i]}" == "$target" ]]; then
      printf '%s' "$i"
      return 0
    fi
  done
  return 1
}

start="$(idx_of "$FROM")" || die "unknown --from '$FROM'"
end="$(idx_of "$TO")" || die "unknown --to '$TO'"
[[ "$start" -le "$end" ]] || die "--from must not come after --to"

title="$(gh issue view "$ISSUE" --json title --jq '.title' 2>/dev/null || true)"
[[ -n "$title" ]] || die "issue #$ISSUE not found or not accessible"
log "issue #$ISSUE: $title"
printf '\n'

should_run() {
  local step="$1" i
  i="$(idx_of "$step")" || return 1
  [[ "$i" -ge "$start" && "$i" -le "$end" ]]
}

step_ack() {
  log "== STEP: acknowledge =="
  "$SCRIPT_DIR/issue-ack.sh" "$ISSUE"
}

step_implement() {
  log "== STEP: implement =="
  local wt
  wt="$(state_get "$ROOT" "$ISSUE" worktree)"
  wt="${wt:-$(issue_worktree_path "$ISSUE")}"
  if [[ ! -d "$wt" ]]; then
    warn "worktree not found at $wt; run ack first"
    return 1
  fi
  if ! has_cmd opencode; then
    warn "opencode CLI not found; implement manually, then rerun with --from test"
    return 1
  fi
  local prompt="Implement GitHub issue #${ISSUE} (\"${title}\") in this Story Builder checkout.

Follow AGENTS.md and the implement skill: write failing tests first (strict TDD), then the minimal implementation, then refactor. Cover the 4 UI states where relevant. Run \`npm test\` until green. Do NOT push, open a PR, or merge — that is handled by the workflow."
  log "launching issue-implementer agent in $wt"
  opencode run --agent issue-implementer --dir "$wt" "$prompt"
}

step_test() {
  log "== STEP: test =="
  local wt
  wt="$(state_get "$ROOT" "$ISSUE" worktree)"
  wt="${wt:-$(issue_worktree_path "$ISSUE")}"
  "$SCRIPT_DIR/issue-test.sh" --dir "$wt"
}

step_review() {
  log "== STEP: independent review =="
  local wt
  wt="$(state_get "$ROOT" "$ISSUE" worktree)"
  wt="${wt:-$(issue_worktree_path "$ISSUE")}"
  "$SCRIPT_DIR/issue-review.sh" "$ISSUE" --dir "$wt"
}

step_pr() {
  log "== STEP: pull request =="
  local wt
  wt="$(state_get "$ROOT" "$ISSUE" worktree)"
  wt="${wt:-$(issue_worktree_path "$ISSUE")}"
  "$SCRIPT_DIR/pr-create.sh" "$ISSUE" --dir "$wt" --commit feat
}

step_merge() {
  log "== STEP: merge =="
  local args=("$ISSUE")
  if [[ "$YES" == 1 ]]; then args+=(--yes); fi
  "$SCRIPT_DIR/pr-merge.sh" "${args[@]}"
}

for step in "${STEPS[@]}"; do
  should_run "$step" || continue
  case "$step" in
    ack) step_ack ;;
    implement)
      if [[ "$AUTO" == 1 ]]; then step_implement; else
        log "== STEP: implement (manual) =="
        wt="$(state_get "$ROOT" "$ISSUE" worktree)"
        wt="${wt:-$(issue_worktree_path "$ISSUE")}"
        log "implement issue #$ISSUE in $wt, then run: scripts/run-issue.sh $ISSUE --from test"
        if [[ "$end" -gt "$(idx_of implement)" ]]; then
          warn "continuing without an automated implement step"
        fi
      fi
      ;;
    test) step_test ;;
    review) step_review ;;
    pr) step_pr ;;
    merge)
      if [[ "$DO_MERGE" == 1 ]]; then step_merge; fi
      ;;
  esac
done

printf '\n'
ok "flow finished for issue #$ISSUE (through '$TO')"
