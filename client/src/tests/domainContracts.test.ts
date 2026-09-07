import { describe, it, expect } from 'vitest';
import { AppError } from '../types/domain';
import type { Ok, ErrorBody, LoginRequest } from '../types/api';

// TICKET-10: Authoritative TS domain contracts — file compiles; key shapes exist.
describe('TICKET-10 — domain contracts', () => {
  it('AppError carries code + optional fields', () => {
    const err = new AppError('VALIDATION_ERROR', 'bad', [{ field: 'email', message: 'Required' }]);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('bad');
    expect(err.fields?.[0]?.field).toBe('email');
    expect(err.name).toBe('AppError');
  });

  it('api.ts exports Ok / ErrorBody and auth request shapes', () => {
    const ok: Ok = { ok: true };
    const err: ErrorBody = { code: 'UNAUTHORIZED', message: 'nope' };
    const req: LoginRequest = { email: 'a@b.c', password: 'z' };
    expect(ok.ok).toBe(true);
    expect(err.message).toBe('nope');
    expect(req.password).toBe('z');
  });
});