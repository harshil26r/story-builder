# TICKET-16 — [backend] Auth middleware (authGuard + optionalAuth)

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-16] [backend] Auth middleware (authGuard + optionalAuth)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/middleware/authGuard.js`
  - **Prerequisites**: TICKET-12
  - **TDD Criteria**: Integration test: `authGuard` on protected route returns `401 UNAUTHORIZED` when no session; returns `200` + `req.user` when valid session. `optionalAuth` variant sets `req.user = null` instead of failing.


---
Back to [TICKETS.md](../TICKETS.md)
