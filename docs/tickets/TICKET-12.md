# TICKET-12 — [backend] Session config (express-session + connect-mongo)

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-12] [backend] Session config (express-session + connect-mongo)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/config/session.js`
  - **Prerequisites**: TICKET-04, TICKET-05
  - **TDD Criteria**: Integration test: server boots, `POST /api/auth/signup` (stub) sets `Set-Cookie` header containing `connect.sid`; cookie flags: `httpOnly`, `sameSite=Lax`, `Secure` only when `NODE_ENV=production`. TTL = 7 days. ACR-B-08.


---
Back to [TICKETS.md](../TICKETS.md)
