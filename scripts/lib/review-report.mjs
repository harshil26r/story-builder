#!/usr/bin/env node
// Extract the reviewer's final message from an `opencode run --format json`
// event stream. The default CLI format includes ANSI escape codes, tool-call
// transcripts, and command output; embedding that verbatim in a PR body can
// exceed GitHub's 65,536-character limit, so we persist only the report.

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function stripAnsi(text) {
  return String(text ?? '').replace(ANSI_PATTERN, '');
}

export function extractFinalMessage(stream) {
  const messages = new Map();
  for (const line of String(stream ?? '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue; // tolerate non-JSON lines (logs, banners, warnings)
    }

    const part = event && event.part;
    if (!part || part.type !== 'text' || typeof part.text !== 'string') continue;

    const id = part.messageID || event.sessionID || 'default';
    if (!messages.has(id)) messages.set(id, []);
    messages.get(id).push(part.text);
  }

  const groups = [...messages.values()];
  if (groups.length === 0) return '';
  return groups[groups.length - 1].join('');
}

export function extractReviewReport(stream) {
  return stripAnsi(extractFinalMessage(stream)).trim();
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const report = extractReviewReport(await readStdin());
  process.stdout.write(report ? `${report}\n` : '');
}

const invokedAsScript =
  process.argv[1] && process.argv[1].endsWith('review-report.mjs');
if (invokedAsScript) {
  main().catch((err) => {
    process.stderr.write(`review-report: ${err?.message || err}\n`);
    process.exitCode = 1;
  });
}
