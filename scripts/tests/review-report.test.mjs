import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractFinalMessage, extractReviewReport, stripAnsi } from '../lib/review-report.mjs';

function textEvent(messageID, text) {
  return JSON.stringify({ type: 'text', part: { type: 'text', messageID, text } });
}

test('returns only the final assistant message, ignoring earlier steps and tool parts', () => {
  const stream = [
    JSON.stringify({ type: 'step_start', part: { type: 'step-start' } }),
    textEvent('m1', 'Let me inspect the diff.'),
    JSON.stringify({ type: 'tool', part: { type: 'tool', messageID: 'm2' } }),
    JSON.stringify({ type: 'reasoning', part: { type: 'reasoning', messageID: 'm2', text: 'thinking' } }),
    textEvent('m3', '### Summary\n'),
    textEvent('m3', 'VERDICT: PASSED'),
  ].join('\n');

  assert.equal(extractFinalMessage(stream), '### Summary\nVERDICT: PASSED');
});

test('tolerates non-JSON log lines and blank lines', () => {
  const stream = [
    'npm warn something deprecation',
    '',
    textEvent('m1', 'report'),
    'look here: not json at all',
  ].join('\n');

  assert.equal(extractFinalMessage(stream), 'report');
});

test('returns an empty string when there is no assistant text', () => {
  assert.equal(extractFinalMessage(''), '');
  assert.equal(
    extractFinalMessage(JSON.stringify({ type: 'step_finish', part: { type: 'step-finish' } })),
    '',
  );
});

test('stripAnsi removes terminal escape sequences', () => {
  assert.equal(stripAnsi('\u001B[0mhello \u001B[32mworld\u001B[39m'), 'hello world');
});

test('extractReviewReport strips ANSI and trims surrounding whitespace', () => {
  const stream = ['\u001B[0m> issue-reviewer', textEvent('m1', '\n  ### Summary\nVERDICT: PASSED\n')].join(
    '\n',
  );

  assert.equal(extractReviewReport(stream), '### Summary\nVERDICT: PASSED');
});
