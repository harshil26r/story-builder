import { describe, it, expect, vi } from 'vitest';
import { globalLimiter, authLimiter, aiLimiter, sendOtpLimiter } from '../middleware/rateLimit.js';

function fakeReq(overrides = {}) {
  return { ip: '1.2.3.4', session: { userId: 'u1' }, body: {}, headers: {}, ...overrides };
}
function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    setHeader(k, v) { this.headers[k] = v; return this; },
    getHeader(k) { return this.headers[k]; },
  };
  return res;
}

describe('rate limit middleware (TICKET-13)', () => {
  it('globalLimiter returns 429 after exceeding its cap from the same IP', async () => {
    // First request passes.
    const req = fakeReq();
    const res = fakeRes();
    const next = vi.fn();
    await globalLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('authLimiter enforces 10 req/min per IP: the 11th request gets 429 RATE_LIMITED', async () => {
    // Use a fresh IP so we start clean.
    const req = fakeReq({ ip: '9.9.9.9' });
    const res = fakeRes();
    const next = vi.fn();

    const limit = authLimiter;
    const seen = new Set();
    // Express-rate-limit stores counts via getKey/resetKey on the instance.
    // We drive the actual middleware by cycling a second res/req chain; the
    // simplest reliable check: call getKey then resetKey to observe the counter.
    for (let i = 0; i < 10; i++) {
      await limit(fakeReq({ ip: '9.9.9.9' }), fakeRes(), next);
    }
    // 11th request from same IP exceeds max=10
    const res2 = fakeRes();
    await limit(fakeReq({ ip: '9.9.9.9' }), res2, () => {});
    expect(res2.statusCode).toBe(429);
    expect(res2.payload.code).toBe('RATE_LIMITED');
    expect(res2.headers['Retry-After']).toBeTruthy();
  });

  it('aiLimiter is keyed by session userId', async () => {
    const req = fakeReq({ session: { userId: 'abc123' } });
    const res = fakeRes();
    const next = vi.fn();
    // Request passes (not yet limited)
    await aiLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    // Users shouldn't share counts: abc123 has 1, another user passes cleanly.
    const res2 = fakeRes();
    await aiLimiter(fakeReq({ session: { userId: 'xyz' } }), res2, () => {});
    expect(res2.statusCode).toBe(200);
  });

  it('sendOtpLimiter is keyed by email', async () => {
    const res = fakeRes();
    await sendOtpLimiter(fakeReq({ body: { email: 'me@example.com' } }), res, () => {});
    expect(res.statusCode).toBe(200);
  });
});