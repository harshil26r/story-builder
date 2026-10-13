import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { issueNumberFromBranch, prNumberFromUrl } from '../lib/branch.mjs';

const BRANCH_MJS = fileURLToPath(new URL('../lib/branch.mjs', import.meta.url));

// ─── issueNumberFromBranch ────────────────────────────────────────────────────

test('extracts the issue number from an issue/ branch name', () => {
  assert.equal(issueNumberFromBranch('issue/7-pr-merge-mixes'), 7);
  assert.equal(issueNumberFromBranch('issue/123'), 123);
  assert.equal(issueNumberFromBranch('  issue/42-slug-with-dashes  '), 42);
});

test('returns null when the branch is not an issue branch', () => {
  assert.equal(issueNumberFromBranch('main'), null);
  assert.equal(issueNumberFromBranch('feature/7-thing'), null);
  assert.equal(issueNumberFromBranch('issue/abc-def'), null);
  assert.equal(issueNumberFromBranch(''), null);
  assert.equal(issueNumberFromBranch(undefined), null);
});

// ─── prNumberFromUrl ──────────────────────────────────────────────────────────

test('extracts PR number from a full GitHub PR URL', () => {
  assert.equal(prNumberFromUrl('https://github.com/owner/repo/pull/42'), 42);
  assert.equal(prNumberFromUrl('https://github.com/owner/repo/pull/1'), 1);
  assert.equal(prNumberFromUrl('https://github.com/org/project/pull/999'), 999);
});

test('returns null for non-PR URLs or invalid input', () => {
  assert.equal(prNumberFromUrl('https://github.com/owner/repo/issues/5'), null);
  assert.equal(prNumberFromUrl('https://github.com/owner/repo'), null);
  assert.equal(prNumberFromUrl('not-a-url'), null);
  assert.equal(prNumberFromUrl(''), null);
  assert.equal(prNumberFromUrl(undefined), null);
});

// ─── branch.mjs CLI mode ─────────────────────────────────────────────────────

test('CLI: prints issue number to stdout for a valid issue branch', () => {
  const result = spawnSync(process.execPath, [BRANCH_MJS, 'issue/7-some-slug']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.toString().trim(), '7');
  assert.equal(result.stderr.toString(), '');
});

test('CLI: prints nothing and exits 0 for a non-issue branch', () => {
  const result = spawnSync(process.execPath, [BRANCH_MJS, 'main']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.toString(), '');
  assert.equal(result.stderr.toString(), '');
});

test('CLI: handles missing argument (empty branch) gracefully', () => {
  const result = spawnSync(process.execPath, [BRANCH_MJS]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.toString(), '');
});
