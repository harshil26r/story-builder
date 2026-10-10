import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import OtpToken from '../models/OtpToken.js';

// Unit-level persistence tests against a real Mongo (mongod is running locally).
describe('OtpToken model (TICKET-22)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-otp-token';

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await OtpToken.syncIndexes();
  });

  afterAll(async () => {
    await OtpToken.deleteMany({});
    await mongoose.disconnect();
  });

  it('create succeeds with defaults (attempts = 0)', async () => {
    const token = await OtpToken.create({
      email: 'otp@example.com',
      otpCodeHash: 'a'.repeat(64),
      purpose: 'signup-verify',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(token.email).toBe('otp@example.com');
    expect(token.attempts).toBe(0);
    expect(token.otpCodeHash).toBe('a'.repeat(64));
    expect(token.purpose).toBe('signup-verify');
    expect(token.expiresAt).toBeInstanceOf(Date);
    await token.deleteOne();
  });

  it('email is indexed', async () => {
    const indexes = await OtpToken.collection.indexes();
    const emailIdx = indexes.find((i) => i.key && i.key.email === 1);
    expect(emailIdx).toBeTruthy();
  });

  it('TTL index on expiresAt is present with expireAfterSeconds 0', async () => {
    const indexes = await OtpToken.collection.indexes();
    const ttl = indexes.find((i) => i.key && i.key.expiresAt === 1);
    expect(ttl).toBeTruthy();
    expect(ttl.expireAfterSeconds).toBe(0);
  });

  it('invalid purpose is rejected by the enum', async () => {
    await expect(
      OtpToken.create({
        email: 'bad@example.com',
        otpCodeHash: 'a'.repeat(64),
        purpose: 'not-a-purpose',
        expiresAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});
