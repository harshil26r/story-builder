import { describe, it, expect, vi } from 'vitest';
import { validate } from '../middleware/validate.js';
import { signupSchema } from '../validation/schemas.js';

function fakeRes() {
  const res = {
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
  };
  return res;
}

describe('validate middleware (TICKET-15)', () => {
  it('rejects a payload missing required fields with 400 VALIDATION_ERROR + fields array', () => {
    const req = { body: { name: 'OnlyName' } }; // missing email + password
    const res = fakeRes();
    const next = vi.fn();

    validate(signupSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
    // abortEarly:false collects ALL errors
    expect(res.payload.fields.length).toBe(2);
    expect(
      res.payload.fields.every((f) => typeof f.field === 'string' && typeof f.message === 'string'),
    ).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('strips unknown keys and mutates req.body to the validated value', () => {
    const req = {
      body: { name: 'Ada', email: 'ADA@EXAMPLE.COM', password: 'password1', evil: 'x' },
    };
    const res = fakeRes();
    const next = vi.fn();
    validate(signupSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.evil).toBeUndefined();
    expect(req.body.email).toBe('ada@example.com'); // lowercased by Joi
  });

  it('passes through valid payloads', () => {
    const req = { body: { name: 'Ada', email: 'a@b.co', password: 'password1' } };
    const res = fakeRes();
    const next = vi.fn();
    validate(signupSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
