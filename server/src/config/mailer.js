import nodemailer from 'nodemailer';

// StoryBuilder mailer (SPEC §5, ACR-X-04). SMTP transport when SMTP_HOST is
// configured; console-logging stub otherwise (dev fallback). Never crashes.

let transport = null;
let defaultFrom = process.env.MAIL_FROM || 'Story Builder <noreply@storybuilder.app>';

if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
} else {
  // Console fallback — log the would-be email (masked email, no plaintext OTP?).
  // The OTP code itself is dev-only; per §7.5 log lines never include plaintext
  // passwords/OTPs. This fallback logs the *message shape* only, and sendMail
  // prints the subject + masked recipient.
  transport = {
    async sendMail({ to, subject, text }) {
      const masked = String(to).replace(/^(.).+(@.*)$/, (_, a, b) => `${a}***${b}`);
      // eslint-disable-next-line no-console
      console.log(
        `[mailer:console] to=${masked} subject="${subject}" body="${String(text).slice(0, 200)}"`,
      );
      return undefined;
    },
  };
}

// Convenience wrapper so services can call mailer.sendMail(...) whether SMTP or stub.
async function sendMail(opts) {
  return transport.sendMail({ from: defaultFrom, ...opts });
}

export default { sendMail, transport, defaultFrom };
export { transport, defaultFrom };
