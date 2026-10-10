import { describe, it, expect, vi, beforeEach } from 'vitest';

// TICKET-23: Mailer config — SMTP when SMTP_HOST set, console fallback otherwise.
// We mock nodemailer at module level so config/mailer.js receives a real (fake)
// createTransport whose behavior we can assert, and we cannot redefine the
// frozen ESM namespace at runtime.

const createTransportMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: (...args) => createTransportMock(...args) },
  createTransport: (...args) => createTransportMock(...args),
}));

describe('mailer config (TICKET-23)', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
    vi.resetModules();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;
  });

  it('with SMTP_HOST set, createTransport returns a transport using SMTP config', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.MAIL_FROM = 'from@example.com';

    createTransportMock.mockReturnValue({ sendMail: vi.fn() });

    const { default: mailer, transport } = await import('../config/mailer.js');

    expect(createTransportMock).toHaveBeenCalled();
    const opts = createTransportMock.mock.calls[0][0];
    expect(opts.host).toBe('smtp.example.com');
    expect(opts.port).toBe(587);
    expect(opts.secure).toBe(false);
    expect(opts.auth.user).toBe('user');
    expect(opts.auth.pass).toBe('pass');
    expect(mailer.defaultFrom).toBe('from@example.com');
    expect(transport).toBeTruthy();
  });

  it('with SMTP_HOST absent, transport is a console-logging stub that does not throw on sendMail', async () => {
    const { default: mailer, transport } = await import('../config/mailer.js');
    expect(transport).toBeTruthy();
    expect(createTransportMock).not.toHaveBeenCalled();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(
      transport.sendMail({ to: 'a@b.co', subject: 'OTP', text: '123456' }),
    ).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('sendMail without transport (no SMTP) uses a console stub via the default export', async () => {
    const { default: mailer } = await import('../config/mailer.js');
    expect(typeof mailer.sendMail).toBe('function');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(
      mailer.sendMail({ to: 'x@y.z', subject: 'Test', text: 'abc' }),
    ).resolves.toBeUndefined();
    logSpy.mockRestore();
  });
});
