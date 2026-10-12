import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

// Unit-level persistence tests against a real Mongo (mongod is running locally).
describe('User model (TICKET-11)', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1/story-builder-test-user');
    await User.syncIndexes();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  it('hashes the password with bcrypt (passwordHash is not plaintext)', async () => {
    const user = await User.create({
      name: 'Ghost Writer',
      email: 'ghost@example.com',
      passwordHash: 'supersecret1',
    });
    expect(user.passwordHash).not.toBe('supersecret1');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    const ok = await bcrypt.compare('supersecret1', user.passwordHash);
    expect(ok).toBe(true);
    await user.deleteOne();
  });

  it('isEmailVerified defaults to false and googleId defaults to null', async () => {
    const user = await User.create({
      name: 'Unverified',
      email: 'unverified@example.com',
      passwordHash: 'password1',
    });
    expect(user.isEmailVerified).toBe(false);
    expect(user.googleId).toBeNull();
    await user.deleteOne();
  });

  it('enforces unique email via MongoServerError code 11000', async () => {
    await User.create({ name: 'Dup', email: 'dup@example.com', passwordHash: 'password1' });
    await expect(
      User.create({ name: 'Dup2', email: 'dup@example.com', passwordHash: 'password2' }),
    ).rejects.toMatchObject({ code: 11000 });
    await User.deleteMany({ email: 'dup@example.com' });
  });
});
