#!/usr/bin/env bash
# Independent, adversarial review of a completed issue by a DIFFERENT model.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ISSUE=""
DIR=""
WITH_TESTS=1
MODEL="$(reviewer_model)"

usage() {
  cat <<'EOF'
Usage: scripts/issue-review.sh <issue-number> [options]

Runs the `issue-reviewer` opencode sub-agent (default model:
antigravity/gemini-3.8-flash-high) against the issue diff. The reviewer is
READ-ONLY and must produce a verdict of PASSED or CHANGES REQUESTED.

Options:
  --dir DIR         Checkout under review (default: current directory)
  --model MODEL     Override the reviewer model
  --no-tests        Skip `scripts/issue-test.sh` precheck
  -h, --help        Show this help

Exit codes: 0 = PASSED, 2 = CHANGES REQUESTED, 1 = infrastructure failure.
EOF
}

while (($#)); do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --no-tests) WITH_TESTS=0; shift ;;
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
if [[ -z "$DIR" ]]; then DIR="$PWD"; fi
ROOT="$(main_repo_root)"
DIR="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null)" || die "not a git repository: $DIR"

require_cmd opencode

if [[ "$WITH_TESTS" == 1 ]]; then
  "$SCRIPT_DIR/issue-test.sh" --dir "$DIR"
fi

mkdir -p "$(reviews_dir "$ROOT")"
artifact="$(reviews_dir "$ROOT")/issue-${ISSUE}.md"

issue_ctx=""
if gh_ready; then
  issue_ctx="$(gh issue view "$ISSUE" --json title,body --jq '"# " + .title + "\n\n" + .body' 2>/dev/null || true)"
fi
base="$(git -C "$DIR" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
base="${base:-main}"

prompt="You are the independent reviewer for Story Builder. Review GitHub issue #${ISSUE}.

Scope: inspect ONLY this checkout (${DIR}). Do NOT run \`gh\` and do NOT explore
directories outside this repository. Do not modify anything.

Inspect the change with:
  git -C \"${DIR}\" status --porcelain
  git -C \"${DIR}\" diff ${base}            # full working-tree diff vs ${base} (includes uncommitted)
  git -C \"${DIR}\" log --oneline ${base}..HEAD
Then read the changed files and their tests.

Issue context (may be empty when gh is unavailable):
---
${issue_ctx}
---

Verify that: every acceptance criterion is objectively met; new behaviour is
covered by tests that would fail without the change; the 4 UI states and error
paths are handled where relevant; there are no security (authz, injection,
secret handling), a11y, or data-integrity regressions; and no unrelated changes
are bundled in. Cite evidence as file:line. Keep the report under ~400 words.

End your reply with exactly one line, either:
VERDICT: PASSED
or
VERDICT: CHANGES REQUESTED"

# Capture the raw JSON event stream so the transcript stays available for
# debugging, and persist only the reviewer's final report to the artifact.
raw_stream="$(reviews_dir "$ROOT")/issue-${ISSUE}.md.full.jsonl"
err_stream="$(reviews_dir "$ROOT")/issue-${ISSUE}.md.full.err"
log "running independent review with model: $MODEL (raw stream: $raw_stream)"
set +e
opencode run --agent issue-reviewer --dir "$DIR" --model "$MODEL" --format json "$prompt" \
  >"$raw_stream" 2>"$err_stream"
status=$?
set -e

if [[ "$status" -ne 0 ]]; then
  warn "reviewer stderr: $err_stream"
  die "reviewer invocation failed (exit $status)"
fi

node "$SCRIPT_DIR/lib/review-report.mjs" <"$raw_stream" >"$artifact"
if [[ ! -s "$artifact" ]]; then
  warn "could not extract a report from $raw_stream — falling back to raw stream"
  cp "$raw_stream" "$artifact"
fi

state_set "$ROOT" "$ISSUE" review "$artifact"
state_set "$ROOT" "$ISSUE" status reviewed

if grep -qE '^VERDICT:[[:space:]]*CHANGES REQUESTED' "$artifact"; then
  err "independent review requested changes — see $artifact"
  exit 2
fi
if ! grep -qE '^VERDICT:[[:space:]]*PASSED' "$artifact"; then
  warn "reviewer did not emit a recognised verdict; treating as CHANGES REQUESTED"
  exit 2
fi

ok "independent review passed — report at $artifact"
