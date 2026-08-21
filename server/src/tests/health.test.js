import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createApp from '../app.js';

describe('health route', () => {
  let server;
  let base;

  beforeAll(async () => {
    // Use the real local Mongo for the integration test; skip cleanly if absent.
    try {
      await mongoose.connect('mongodb://127.0.0.1/story-builder-test');
    } catch {
      console.error('mongod not running — skipping health integration test');
      return;
    }
    const app = await createApp('mongodb://127.0.0.1/story-builder-test');
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) {
      server.close();
      await mongoose.disconnect();
    }
  });

  it('GET /api/health returns 200 { ok: true, timestamp }', async () => {
    if (!base) return; // mongod absent
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});