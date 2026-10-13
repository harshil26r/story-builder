#!/usr/bin/env bash
# Push the issue branch and open a pull request with a generated description.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ISSUE=""
DIR=""
BASE=""
TITLE=""
DRAFT=0
DO_COMMIT=0
COMMIT_TYPE="feat"

usage() {
  cat <<'EOF'
Usage: scripts/pr-create.sh <issue-number> [options]

  --dir DIR          Checkout to push from (default: current directory)
  --base BRANCH      Base branch (default: origin default, else main)
  --title TITLE      PR title (default: issue title)
  --commit TYPE      Commit staged changes as "TYPE(issue-<n>): <title>"
                     (default: require a clean tree)
  --draft            Open as a draft PR
  -h, --help         Show this help

The PR body is written to .workflow/pr/issue-<n>.md and includes the linked
issue, change list, test evidence, and the independent review report.
EOF
}

while (($#)); do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --commit) DO_COMMIT=1; COMMIT_TYPE="$2"; shift 2 ;;
    --draft) DRAFT=1; shift ;;
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

require_gh_auth
ensure_workflow_labels

if [[ -z "$BASE" ]]; then
  BASE="$(git -C "$DIR" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
  BASE="${BASE:-main}"
fi

branch="$(git -C "$DIR" rev-parse --abbrev-ref HEAD)"
[[ "$branch" != "$BASE" ]] || die "refusing to open a PR from the base branch '$BASE'"

if [[ -z "$TITLE" ]]; then
  TITLE="$(gh issue view "$ISSUE" --json title --jq '.title' 2>/dev/null || true)"
  [[ -n "$TITLE" ]] || TITLE="issue #$ISSUE"
fi

if [[ -n "$(git -C "$DIR" status --porcelain)" ]]; then
  if [[ "$DO_COMMIT" == 1 ]]; then
    git -C "$DIR" add -A
    git -C "$DIR" commit -m "${COMMIT_TYPE}(issue-${ISSUE}): ${TITLE}" -m "Refs #${ISSUE}" >/dev/null
    ok "committed working tree"
  else
    die "working tree is dirty in $DIR; commit first or pass --commit"
  fi
fi

log "pushing $branch to origin"
git -C "$DIR" push -u origin HEAD >/dev/null
ok "pushed $branch"

mkdir -p "$(pr_dir "$ROOT")"
body="$(pr_dir "$ROOT")/issue-${ISSUE}.md"
review="$(reviews_dir "$ROOT")/issue-${ISSUE}.md"

# GitHub rejects PR bodies over 65,536 characters. Cap the embedded review so a
# verbose report cannot break PR creation.
MAX_REVIEW_CHARS=50000
MAX_BODY_BYTES=60000
review_body=""
if [[ -f "$review" ]]; then
  review_body="$(cat "$review")"
  if (( ${#review_body} > MAX_REVIEW_CHARS )); then
    review_body="${review_body:0:MAX_REVIEW_CHARS}"
    review_body+=$'\n\n_…embedded review truncated to fit GitHub'"'"'s PR body limit._'
    warn "embedded review truncated to ${MAX_REVIEW_CHARS} chars"
  fi
fi

{
  printf '## Summary\n\n%s\n\nCloses #%s\n\n' "$TITLE" "$ISSUE"
  printf '## Changes\n\n'
  git -C "$DIR" log --oneline "${BASE}..HEAD" | sed 's/^/- /'
  printf '\n## Test plan\n\n'
  printf -- '- [x] `npm test` (server + client Vitest)\n'
  printf -- '- [x] `npm run typecheck`\n'
  printf -- '- [x] `npm run lint`\n'
  if [[ -n "$review_body" ]]; then
    printf '\n## Independent review\n\n_Model: %s (read-only reviewer)._\n\n' "$(reviewer_model)"
    printf '%s\n' "$review_body"
  fi
  printf '\n## Risk & rollback\n\n'
  printf -- '- Risk: low; scoped to issue #%s.\n' "$ISSUE"
  printf -- '- Rollback: revert this PR (`git revert -m 1 <merge-sha>`).\n'
} >"$body"

body_bytes="$(wc -c <"$body")"
if (( body_bytes > MAX_BODY_BYTES )); then
  die "generated PR body is ${body_bytes} bytes (GitHub limit 65536); trim $(reviews_dir "$ROOT")/issue-${ISSUE}.md"
fi
ok "wrote PR body: $body (${body_bytes} bytes)"

args=(pr create --base "$BASE" --head "$branch" --title "$TITLE" --body-file "$body" --label "status:review" --label "status:pr")
if [[ "$DRAFT" == 1 ]]; then args+=(--draft); fi

url="$(gh "${args[@]}")"
state_set "$ROOT" "$ISSUE" pr "$url"
state_set "$ROOT" "$ISSUE" status pr-open
ok "opened PR: $url"
printf '%s\n' "$url"
