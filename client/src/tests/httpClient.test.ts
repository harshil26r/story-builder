import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, getCookie, CSRF_COOKIE_NAME, authApi } from '../services/api';
import { AppError } from '../types/domain';

// TICKET-18: HTTP client + CSRF integration.
describe('TICKET-18 — http client + CSRF', () => {
  const origFetch = globalThis.fetch;

  function setCookie(name: string, value: string) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
  }

  beforeEach(() => {
    document.cookie = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    document.cookie = '';
  });

  it('attaches x-csrf-token header from cookie on mutating verbs', async () => {
    setCookie(CSRF_COOKIE_NAME, 'abc123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    });
    globalThis.fetch = fetchMock;

    await http.post('/auth/login', { email: 'a@b.c', password: 'z' });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('abc123');
  });

  it('does NOT attach csrf header on GET', async () => {
    setCookie(CSRF_COOKIE_NAME, 'abc123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    });
    globalThis.fetch = fetchMock;

    await http.get('/auth/me');

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBeUndefined();
  });

  it('supports noCsrf skip', async () => {
    setCookie(CSRF_COOKIE_NAME, 'abc123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    });
    globalThis.fetch = fetchMock;

    await http.post('/auth/login', {}, { noCsrf: true });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBeUndefined();
  });

  it('throws AppError with code/message/fields on non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers(),
      json: async () => ({
        code: 'VALIDATION_ERROR',
        message: 'Email is required',
        fields: [{ field: 'email', message: 'Required' }],
      }),
    });

    const err = (await http.get<unknown>('/x').catch(<T>(e: T): T => e)) as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Email is required');
    expect(err.fields?.[0]?.field).toBe('email');
  });

  it('reads csrf cookie via getCookie', () => {
    setCookie(CSRF_COOKIE_NAME, 'token-1');
    expect(getCookie(CSRF_COOKIE_NAME)).toBe('token-1');
  });

  it('authApi.csrf hits GET /auth/csrf', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ csrfToken: 't' }),
    });
    globalThis.fetch = fetchMock;
    const res = await authApi.csrf();
    expect(res.csrfToken).toBe('t');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/csrf');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
  });
});
