# TICKET-51 — [backend] AI rate limit + cost guard middleware

> **Phase 6: AI Service + SSE Streaming**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-51] [backend] AI rate limit + cost guard middleware**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/middleware/rateLimit.js` (edit: add `aiLimiter` with per-user window + units)
  - **Prerequisites**: TICKET-13, TICKET-11
  - **TDD Criteria**: Unit test: `aiLimiter` keyed by `req.session.userId`. Cost units = 1 for generate; 1 + chaptersRegenerated for regenerate. Exceeds limit → `429 RATE_LIMITED`. `User.aiUsage.calls[]` pruned to window; `dayTokens` checked against `AI_DAILY_TOKEN_BUDGET`. ACR-B-16.


---
Back to [TICKETS.md](../TICKETS.md)
