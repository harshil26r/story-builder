# TICKET-93 — [root] Graceful degradation verification

> **Phase 14: Review + Harden**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-93] [root] Graceful degradation verification**
  - **Target Files**: test files, config files
  - **Prerequisites**: TICKET-49, TICKET-23, TICKET-27, TICKET-30
  - **TDD Criteria**: Env-toggled integration tests: SMTP absent → OTP logged to console (no crash). Google creds absent → Google routes return `501`. Cloudinary absent → uploads use local storage. Anthropic absent → AI endpoints emit `503 AI_UNAVAILABLE`. Each fallback tested in isolation. ACR-X-04.


---
Back to [TICKETS.md](../TICKETS.md)
