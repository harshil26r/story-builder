import { describe, it, expect, afterAll } from 'vitest';
import mongoose from 'mongoose';
import createSessionMiddleware from '../config/session.js';

describe('session config (TICKET-12)', () => {
  it('returns cookie flags: httpOnly, sameSite lax, secure only in production, maxAge 7d', () => {
    delete process.env.NODE_ENV;
    const sess = createSessionMiddleware('mongodb://127.0.0.1/story-builder-test');
    expect(sess.cookie.httpOnly).toBe(true);
    expect(sess.cookie.sameSite).toBe('lax');
    expect(sess.cookie.secure).toBe(false);
    expect(sess.cookie.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('sets secure cookie when NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    const sess = createSessionMiddleware('mongodb://127.0.0.1/story-builder-test');
    expect(sess.cookie.secure).toBe(true);
    delete process.env.NODE_ENV;
  });

  it('uses 7-day TTL on the Mongo store', () => {
    const sess = createSessionMiddleware('mongodb://127.0.0.1/story-builder-test');
    expect(sess.store).toBeDefined();
    expect(typeof sess.store.get).toBe('function');
    expect(typeof sess.store.set).toBe('function');
  });

  it('falls back to a dev secret when SESSION_SECRET absent', () => {
    delete process.env.SESSION_SECRET;
    const sess = createSessionMiddleware('mongodb://127.0.0.1/story-builder-test');
    expect(sess.secret).toBe('dev-secret-change-me');
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
});
