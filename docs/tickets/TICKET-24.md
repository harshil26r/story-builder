# TICKET-24 — [backend] OTP service (send, verify, resend cooldown, lockout)

> **Phase 2: OTP Module + Email**
> **Status**: :white_check_mark: done

- [x] **[TICKET-24] [backend] OTP service (send, verify, resend cooldown, lockout)**
  - **Verified 2026-09-15**: otpService.test.js (6 tests) passes — sha256 hash (64 hex), 3-attempt lockout → OTP_TOO_MANY_ATTEMPTS, 60s resend cooldown, 5/15min send limit. Real sha256-hashed storage confirmed in code.
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/otpService.js` (replace stub)
  - **Prerequisites**: TICKET-22, TICKET-23
  - **TDD Criteria**: Unit test: `send(email, 'signup-verify')` generates 6-digit code, stores sha256 hash (assert no plaintext in DB), sends via mailer, returns ok. `verify(email, code, purpose)` returns true on match. 3 failed verifies → delete token + throw `OTP_TOO_MANY_ATTEMPTS`. Resend within 60s → throw cooldown error. 5th send in 15 min → throw rate limit. Code stored as sha256 hex (assert `otpCodeHash.length === 64`). ACR-B-06.


---
Back to [TICKETS.md](../TICKETS.md)
