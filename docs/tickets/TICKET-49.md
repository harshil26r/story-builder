# TICKET-49 — [backend] AI config (Claude client)

> **Phase 6: AI Service + SSE Streaming**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-49] [backend] AI config (Claude client)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/config/claude.js`
  - **Prerequisites**: TICKET-04
  - **TDD Criteria**: Unit test: when `ANTHROPIC_AUTH_TOKEN` is set, exports initialized Anthropic client. When absent, exports `null` + logs warning. `AI_MODEL` env overrides default `sonnet-5`. `AI_MAX_TOKENS_PER_CHAPTER` env overrides default 6000. ACR-B-16 (AI_UNAVAILABLE when absent), ACR-X-04.


---
Back to [TICKETS.md](../TICKETS.md)
