import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SCRATCH_FILE = /^scratch-.*\.(test|spec)\.[cm]?[jt]sx?$/;
const DEBUG_CALL = /console\.(log|debug|dir)\s*\(/;

describe('client test hygiene', () => {
  const testFiles = readdirSync(testsDir).filter((f) => TEST_FILE.test(f));

  it('has no leftover scratch test files', () => {
    expect(testFiles.filter((f) => SCRATCH_FILE.test(f))).toEqual([]);
  });

  it('contains no debug console output in test files', () => {
    const offenders = testFiles.filter((f) =>
      DEBUG_CALL.test(readFileSync(path.join(testsDir, f), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
