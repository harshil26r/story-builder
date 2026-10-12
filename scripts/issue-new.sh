#!/usr/bin/env bash
# Create a numbered GitHub issue using the Story Builder task template.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

TITLE=""
BODY_FILE=""
TYPE="feature"
EXTRA_LABEL=""

usage() {
  cat <<'EOF'
Usage: scripts/issue-new.sh "<title>" [options]

  --body-file FILE   Markdown body for the issue (default: generated stub)
  --type TYPE        feature | bug | chore (default: feature)
  --label LABEL      Additional label (repeatable)
  -h, --help         Show this help

The issue number assigned by GitHub is the canonical number used everywhere
(branches, commits, PRs).
EOF
}

while (($#)); do
  case "$1" in
    --body-file) BODY_FILE="$2"; shift 2 ;;
    --type) TYPE="$2"; shift 2 ;;
    --label) EXTRA_LABEL="${EXTRA_LABEL}${2}"$'\n'; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *)
      if [[ -z "$TITLE" ]]; then
        TITLE="$1"
      else
        die "unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

[[ -n "$TITLE" ]] || {
  usage
  die "title is required"
}
case "$TYPE" in
  feature | bug | chore) ;;
  *) die "invalid --type '$TYPE' (feature|bug|chore)" ;;
esac

require_gh_auth
ensure_workflow_labels

if [[ -z "$BODY_FILE" ]]; then
  tmp="$(mktemp)"
  cat >"$tmp" <<EOF
## Summary

$TITLE

## Acceptance criteria

- [ ] TODO

## Test plan

- [ ] TODO

## Out of scope

- TODO
EOF
  BODY_FILE="$tmp"
fi
[[ -f "$BODY_FILE" ]] || die "body file not found: $BODY_FILE"

args=(issue create --title "$TITLE" --body-file "$BODY_FILE" --label "type:$TYPE")
while IFS= read -r label; do
  [[ -n "$label" ]] || continue
  ensure_label "$label"
  args+=(--label "$label")
done <<<"$EXTRA_LABEL"

url="$(gh "${args[@]}")"
number="${url##*/}"
ok "created issue #$number: $url"
printf '%s\n' "$number"
