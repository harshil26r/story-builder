#!/usr/bin/env node
// Parse the issue number encoded in an `issue/<n>-<slug>` branch name so tools
// can map a PR back to the worktree created for its issue. Issue and PR numbers
// are independent sequences, so callers must never assume they are equal.

export function issueNumberFromBranch(branch) {
  const match = /^issue\/(\d+)(?:-|$)/.exec(String(branch ?? '').trim());
  return match ? Number(match[1]) : null;
}

/**
 * Extract the PR number from a full GitHub pull-request URL.
 * e.g. https://github.com/owner/repo/pull/42 → 42
 * Returns null for anything that is not a PR URL.
 */
export function prNumberFromUrl(url) {
  const match = /\/pull\/(\d+)(?:\/|$)/.exec(String(url ?? ''));
  return match ? Number(match[1]) : null;
}

const invokedAsScript = process.argv[1] && process.argv[1].endsWith('branch.mjs');
if (invokedAsScript) {
  const issue = issueNumberFromBranch(process.argv[2]);
  if (issue !== null) process.stdout.write(`${issue}\n`);
}
