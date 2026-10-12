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

{
  printf '## Summary\n\n%s\n\nCloses #%s\n\n' "$TITLE" "$ISSUE"
  printf '## Changes\n\n'
  git -C "$DIR" log --oneline "${BASE}..HEAD" | sed 's/^/- /'
  printf '\n## Test plan\n\n'
  printf -- '- [x] `npm test` (server + client Vitest)\n'
  printf -- '- [x] `npm run typecheck`\n'
  printf -- '- [x] `npm run lint`\n'
  if [[ -f "$review" ]]; then
    printf '\n## Independent review\n\n_Model: %s (read-only reviewer)._\n\n' "$(reviewer_model)"
    cat "$review"
    printf '\n'
  fi
  printf '\n## Risk & rollback\n\n'
  printf -- '- Risk: low; scoped to issue #%s.\n' "$ISSUE"
  printf -- '- Rollback: revert this PR (`git revert -m 1 <merge-sha>`).\n'
} >"$body"
ok "wrote PR body: $body"

args=(pr create --base "$BASE" --head "$branch" --title "$TITLE" --body-file "$body" --label "status:review" --label "status:pr")
if [[ "$DRAFT" == 1 ]]; then args+=(--draft); fi

url="$(gh "${args[@]}")"
state_set "$ROOT" "$ISSUE" pr "$url"
state_set "$ROOT" "$ISSUE" status pr-open
ok "opened PR: $url"
printf '%s\n' "$url"
