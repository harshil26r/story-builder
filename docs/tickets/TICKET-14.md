# TICKET-14 — [backend] CSRF double-submit middleware

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-14] [backend] CSRF double-submit middleware**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/middleware/csrf.js`
  - **Prerequisites**: TICKET-12
  - **TDD Criteria**: Integration test: `GET /api/auth/csrf` sets `csrfToken` cookie and returns `{ csrfToken }`. Subsequent `POST` without `x-csrf-token` header returns `403 FORBIDDEN`. `POST` with matching header passes. `GET /api/auth/google*` is exempt. ACR-X-03.


---
Back to [TICKETS.md](../TICKETS.md)
