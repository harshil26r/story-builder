import { describe, it, expect, vi } from 'vitest';
import { csrfToken, csrfProtect } from '../middleware/csrf.js';

function fakeReq(overrides = {}) {
  const req = {
    method: 'POST',
    path: '/api/stories',
    cookies: {},
    headers: {},
    session: {},
    ...overrides,
  };
  return req;
}
function fakeRes() {
  const res = {
    headers: {},
    payload: undefined,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    cookie(name, value, opts) {
      this.cookieOpts = { name, value, opts };
      return this;
    },
    locals: {},
  };
  return res;
}

describe('CSRF double-submit middleware (TICKET-14)', () => {
  it('GET /api/auth/csrf sets a csrfToken cookie and returns { csrfToken }', () => {
    const req = fakeReq({ method: 'GET', path: '/api/auth/csrf' });
    const res = fakeRes();
    csrfToken(req, res, () => {});
    expect(res.cookieOpts.name).toBe('csrfToken');
    expect(typeof res.payload.csrfToken).toBe('string');
    expect(res.payload.csrfToken.length).toBeGreaterThan(10);
  });

  it('POST without x-csrf-token header returns 403 FORBIDDEN', () => {
    const req = fakeReq();
    const res = fakeRes();
    csrfProtect(req, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.payload.code).toBe('FORBIDDEN');
  });

  it('POST with a matching signed header passes', () => {
    const mint = fakeReq({ method: 'GET', path: '/api/auth/csrf' });
    const mintRes = fakeRes();
    csrfToken(mint, mintRes, () => {});
    const token = mintRes.payload.csrfToken;

    const req = fakeReq({
      cookies: { csrfToken: token },
      headers: { 'x-csrf-token': token },
    });
    const res = fakeRes();
    const next = vi.fn();
    csrfProtect(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('POST with matching but unsigned/forged tokens returns 403', () => {
    const token = 'abc-123-secret';
    const req = fakeReq({
      cookies: { csrfToken: token },
      headers: { 'x-csrf-token': token },
    });
    const res = fakeRes();
    const next = vi.fn();
    csrfProtect(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload.code).toBe('FORBIDDEN');
  });

  it('GET requests (non-mutating) pass without a token', () => {
    const req = fakeReq({ method: 'GET', path: '/api/stories' });
    const res = fakeRes();
    const next = vi.fn();
    csrfProtect(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('GET /api/auth/google* is exempt even as a GET (CSRF not applied pre-auth)', () => {
    const req = fakeReq({ method: 'GET', path: '/api/auth/google' });
    const res = fakeRes();
    const next = vi.fn();
    csrfProtect(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
