# TICKET-23 — [backend] Mailer config (SMTP or console fallback)

> **Phase 2: OTP Module + Email**
> **Status**: :white_check_mark: done

- [x] **[TICKET-23] [backend] Mailer config (SMTP or console fallback)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/config/mailer.js`
  - **Prerequisites**: TICKET-04
  - **TDD Criteria**: Unit test: when `SMTP_HOST` is set, `createTransport` uses SMTP config. When absent, transport is a console-logging stub that accepts `sendMail({to, subject, text})` and does not throw. ACR-X-04 (SMTP graceful degradation).


---
Back to [TICKETS.md](../TICKETS.md)
