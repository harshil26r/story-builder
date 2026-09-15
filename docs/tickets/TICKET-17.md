# TICKET-17 — [backend] Auth service + routes (signup, login, logout, me — no OTP yet)

> **Phase 1: Session Auth (no OTP)**
> **Status**: :ballot_box_with_check: done

- [x] **[TICKET-17] [backend] Auth service + routes (signup, login, logout, me — no OTP yet)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/otpService.js` (stub: `send` is no-op, `verify` always true for now), `/home/harshil26r/Projects/story-builder/server/src/controllers/auth.controller.js`, `/home/harshil26r/Projects/story-builder/server/src/routes/auth.routes.js`
  - **Prerequisites**: TICKET-11, TICKET-13, TICKET-14, TICKET-15, TICKET-16
  - **TDD Criteria**: Integration test: `POST /api/auth/signup` creates user → `201 { ok: true }`. `POST /api/auth/login` with valid credentials sets session → `200 { ok: true }`. `GET /api/auth/me` returns `{ user: {...} }`. `POST /api/auth/logout` destroys session. Duplicate email → `409 EMAIL_EXISTS`. Missing fields → `400 VALIDATION_ERROR`. ACR-B-05 (partial: no OTP gating yet).


---
Back to [TICKETS.md](../TICKETS.md)
