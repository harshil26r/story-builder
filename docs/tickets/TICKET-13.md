# TICKET-13 — [backend] Rate limit middleware

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-13] [backend] Rate limit middleware**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/middleware/rateLimit.js`
  - **Prerequisites**: TICKET-05
  - **TDD Criteria**: Unit test: `globalLimiter` returns 429 after 100 requests from same IP in 1 minute. `authLimiter` returns 429 after 10 requests/min/IP. `aiLimiter` returns 429 after limit exceeded per userId. ACR-B-16 (rate limit part).


---
Back to [TICKETS.md](../TICKETS.md)
