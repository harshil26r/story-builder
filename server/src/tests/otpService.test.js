import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import OtpToken from '../models/OtpToken.js';
import otpService from '../services/otpService.js';

// TICKET-24: OTP service — send + verify + cooldown + lockout.
describe('otpService (TICKET-24)', () => {
  const MONGO = 'mongodb://127.0.0.1/story-builder-test-otp-service';
  const EMAIL = 'otp-svc@example.com';

  function fakeMailer() {
    const sent = [];
    return {
      sent,
      async sendMail({ to, subject, text }) {
        sent.push({ to, subject, text });
        return undefined;
      },
    };
  }

  beforeAll(async () => {
    await mongoose.connect(MONGO);
    await OtpToken.syncIndexes();
  });

  afterAll(async () => {
    await OtpToken.deleteMany({});
    await mongoose.disconnect();
  });

  it('send generates a 6-digit code, stores sha256 hash (no plaintext), mails, returns ok', async () => {
    const mailer = fakeMailer();
    const now = Date.now();
    const result = await otpService.send(EMAIL, 'signup-verify', { mailer, now });

    expect(result.ok).toBe(true);
    expect(result.code).toMatch(/^\d{6}$/);

    // Verify the plaintext code is NOT in the DB; only a sha256 hash.
    const doc = await OtpToken.findOne({ email: EMAIL, purpose: 'signup-verify' });
    expect(doc).toBeTruthy();
    expect(doc.otpCodeHash).not.toBe(result.code);
    expect(doc.otpCodeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.attempts).toBe(0);
    expect(doc.expiresAt.getTime()).toBeGreaterThan(now);

    // Mailer was invoked.
    expect(mailer.sent.length).toBe(1);
    expect(mailer.sent[0].to).toBe(EMAIL);

    // Cleanup token and re-create directly for later tests.
    await doc.deleteOne();
  });

  it('verify returns true on code match', async () => {
    const mailer = fakeMailer();
    const { code } = await otpService.send(EMAIL, 'signup-verify', { mailer, now: Date.now() });
    const ok = await otpService.verify(EMAIL, code, 'signup-verify');
    expect(ok).toBe(true);
    await OtpToken.deleteMany({ email: EMAIL });
  });

  it('3 failed verifies delete the token + throw OTP_TOO_MANY_ATTEMPTS', async () => {
    const mailer = fakeMailer();
    const { code } = await otpService.send(EMAIL, 'signup-verify', { mailer, now: Date.now() });

    await otpService.verify(EMAIL, '000000', 'signup-verify');
    await otpService.verify(EMAIL, '000000', 'signup-verify');
    const attempt3 = otpService.verify(EMAIL, '000000', 'signup-verify');

    await expect(attempt3).rejects.toMatchObject({ code: 'OTP_TOO_MANY_ATTEMPTS', status: 429 });

    // Token deleted after 3rd failure.
    const doc = await OtpToken.findOne({ email: EMAIL, purpose: 'signup-verify' });
    expect(doc).toBeNull();

    // Sanity: the right code also fails now (token gone).
    await expect(otpService.verify(EMAIL, code, 'signup-verify')).rejects.toMatchObject({
      code: 'OTP_EXPIRED',
    });
  });

  it('resend within 60s throws cooldown error', async () => {
    const mailer = fakeMailer();
    const now = Date.now();
    await otpService.send(EMAIL, 'signup-verify', { mailer, now });

    await expect(
      otpService.send(EMAIL, 'signup-verify', { mailer, now: now + 10_000 })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });

    await OtpToken.deleteMany({ email: EMAIL });
  });

  it('5 sends allowed / 15 min, 6th send throws rate limit', async () => {
    const mailer = fakeMailer();
    const now = Date.now();
    // Purge any existing tokens to start clean.
    await OtpToken.deleteMany({ email: EMAIL });

    // 5 sends at 60s spacing all succeed (cooldown satisfied, window ≤ 15 min).
    for (let i = 0; i < 5; i++) {
      const r = await otpService.send(EMAIL, 'signup-verify', { mailer, now: now + i * 60_000 });
      expect(r.ok).toBe(true);
    }
    // 6th send within 15min from the first → rate limited.
    await expect(
      otpService.send(EMAIL, 'signup-verify', { mailer, now: now + 6 * 60_000 })
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });

    await OtpToken.deleteMany({ email: EMAIL });
  });

  it('code stored as sha256 hex (assert otpCodeHash.length === 64)', async () => {
    const mailer = fakeMailer();
    await otpService.send(EMAIL, 'signup-verify', { mailer, now: Date.now() });
    const doc = await OtpToken.findOne({ email: EMAIL });
    expect(doc.otpCodeHash.length).toBe(64);
    await OtpToken.deleteMany({ email: EMAIL });
  });
});