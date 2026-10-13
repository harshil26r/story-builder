import { describe, it, expect, afterEach, vi } from 'vitest';
import cors from '../middleware/cors.js';

function fakeReq({ origin, method = 'GET' } = {}) {
  return { headers: origin ? { origin } : {}, method };
}

function fakeRes() {
  return {
    headers: {},
    statusCode: 200,
    ended: false,
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

// CORS middleware (SPEC §7.2): dev relies on the Vite proxy; production/
// split-origin deploys set CORS_ORIGIN to an allowlist (or `*`).
describe('cors middleware (SPEC §7.2)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the Vite dev origins when CORS_ORIGIN is unset', () => {
    vi.stubEnv('CORS_ORIGIN', '');
    const res = fakeRes();
    const next = vi.fn();
    cors(fakeReq({ origin: 'http://localhost:5173' }), res, next);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(res.headers.Vary).toBe('Origin');
    expect(next).toHaveBeenCalled();
  });

  it('allows an origin from the CORS_ORIGIN allowlist', () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com, https://staging.example.com');
    const res = fakeRes();
    cors(fakeReq({ origin: 'https://staging.example.com' }), res, vi.fn());
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://staging.example.com');
  });

  it('does not set CORS headers for a disallowed origin', () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com');
    const res = fakeRes();
    const next = vi.fn();
    cors(fakeReq({ origin: 'https://evil.example.com' }), res, next);
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('reflects the request origin when CORS_ORIGIN is *', () => {
    vi.stubEnv('CORS_ORIGIN', '*');
    const res = fakeRes();
    cors(fakeReq({ origin: 'https://any.example.com' }), res, vi.fn());
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://any.example.com');
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('answers a preflight OPTIONS with 204 and allow lists', () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com');
    const res = fakeRes();
    const next = vi.fn();
    cors(fakeReq({ origin: 'https://app.example.com', method: 'OPTIONS' }), res, next);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
    expect(res.headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(res.headers['Access-Control-Allow-Headers']).toMatch(/x-csrf-token/i);
  });

  it('passes through with no CORS headers when there is no Origin', () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com');
    const res = fakeRes();
    const next = vi.fn();
    cors(fakeReq({}), res, next);
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
