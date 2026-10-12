#!/usr/bin/env bash
# Shared helpers for the Story Builder issue workflow.
# Source this file from scripts in scripts/ (do not execute directly).

set -euo pipefail

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
  C_RESET="$(tput sgr0)"
  C_RED="$(tput setaf 1)"
  C_GREEN="$(tput setaf 2)"
  C_YELLOW="$(tput setaf 3)"
  C_BLUE="$(tput setaf 4)"
else
  C_RESET=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
fi

log() { printf '%s[workflow]%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok() { printf '%s[ ok ]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s[warn]%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
err() { printf '%s[fail]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
die() {
  err "$*"
  exit 1
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

require_cmd() {
  has_cmd "$1" || die "required command not found: $1"
}

# First worktree of the repo (the main checkout, even when called from a linked worktree).
main_repo_root() {
  local wt first
  wt="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
  if [[ -f "$wt/.git" ]]; then
    first="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
    printf '%s' "$first"
  else
    printf '%s' "$wt"
  fi
}

slugify() {
  local s="${1:-issue}"
  s="$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
  s="${s:0:48}"
  printf '%s' "${s:-issue}"
}

# Read KEY from a dotenv-style file without executing it.
env_value() {
  local key="$1" file="${2:-.env}"
  [[ -f "$file" ]] || return 0
  grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" | head -n1 | cut -d= -f2- \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/[[:space:]]+#.*$//'
}

# True when a TCP port is accepting connections.
port_open() {
  local port="$1" host="${2:-127.0.0.1}"
  (exec 3<>"/dev/tcp/${host}/${port}") 2>/dev/null || return 1
  exec 3>&- 2>/dev/null || true
  return 0
}

gh_ready() {
  if ! has_cmd gh; then return 1; fi
  gh auth status >/dev/null 2>&1 || return 1
  return 0
}

require_gh_auth() {
  require_cmd gh
  if ! gh auth status >/dev/null 2>&1; then
    die "GitHub CLI is not authenticated. Run: gh auth login"
  fi
}

# Create/refresh a label without failing when it already exists.
ensure_label() {
  local name="$1" color="${2:-ededed}" desc="${3:-}"
  has_cmd gh || return 0
  gh label create "$name" --color "$color" --description "$desc" --force >/dev/null 2>&1 || true
}

ensure_workflow_labels() {
  ensure_label "status:in-progress" "fbca04" "Issue is being actively worked"
  ensure_label "status:review" "1d76db" "Awaiting independent review"
  ensure_label "status:pr" "0e8a16" "Pull request opened"
  ensure_label "type:feature" "a2eeef" "New capability"
  ensure_label "type:bug" "d73a4a" "Defect"
  ensure_label "type:chore" "c5def5" "Maintenance / tooling"
}

# Path helpers (state lives in the main repo, worktrees live beside it).
state_dir() { printf '%s/.workflow' "$1"; }
issues_state_dir() { printf '%s/issues' "$(state_dir "$1")"; }
issue_dir() { printf '%s/%s' "$(issues_state_dir "$1")" "$2"; }
reviews_dir() { printf '%s/reviews' "$(state_dir "$1")"; }
pr_dir() { printf '%s/pr' "$(state_dir "$1")"; }

# Per-key state files, e.g. .workflow/issues/42/worktree
state_set() {
  local root="$1" issue="$2" key="$3" value="$4" dir
  dir="$(issue_dir "$root" "$issue")"
  mkdir -p "$dir"
  printf '%s\n' "$value" >"$dir/$key"
}

state_get() {
  local root="$1" issue="$2" key="$3" file
  file="$(issue_dir "$root" "$issue")/$key"
  [[ -f "$file" ]] && cat "$file" || true
}

worktree_root() {
  printf '%s' "${WORKTREE_ROOT:-$(dirname "$(main_repo_root)")/story-builder-worktrees}"
}

issue_branch() {
  local n="$1" slug="$2"
  printf 'issue/%s-%s' "$n" "$slug"
}

issue_worktree_path() {
  printf '%s/issue-%s' "$(worktree_root)" "$1"
}

# Repo-relative command helpers.
run_in() {
  local dir="$1"
  shift
  (cd "$dir" && "$@")
}

reviewer_model() {
  printf '%s' "${REVIEWER_MODEL:-antigravity/gemini-3.8-flash-high}"
}
