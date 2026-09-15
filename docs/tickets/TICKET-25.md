# TICKET-25 — [backend] Auth routes: OTP endpoints (send-otp, verify-otp, reset-password)

> **Phase 2: OTP Module + Email**
> **Status**: :white_check_mark: done

- [x] **[TICKET-25] [backend] Auth routes: OTP endpoints (send-otp, verify-otp, reset-password)**
  - **Verified 2026-09-15**: routes present (send-otp, verify-otp, reset-password) with authLimiter + validate; auth.test.js (7 tests) covers verify-otp session set, EMAIL_NOT_VERIFIED on login, reset-password flow. All server tests pass.
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/auth.routes.js` (edit), `/home/harshil26r/Projects/story-builder/server/src/controllers/auth.controller.js` (edit)
  - **Prerequisites**: TICKET-24, TICKET-17
  - **TDD Criteria**: Integration test: `POST /api/auth/send-otp` with valid email → `200 { ok: true }` + OTP sent. `POST /api/auth/verify-otp` with correct code → `200 { ok: true }` + session set + `isEmailVerified` becomes true. Wrong code 3 times → `429 OTP_TOO_MANY_ATTEMPTS`. Login for unverified user → `403 EMAIL_NOT_VERIFIED`. Password reset: send-otp with purpose `password-reset` → verify-otp → reset-password sets new password + session. ACR-B-05, ACR-B-06.


---
Back to [TICKETS.md](../TICKETS.md)
