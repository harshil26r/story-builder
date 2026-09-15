# TICKET-92 — [root] Security audit + hardening

> **Phase 14: Review + Harden**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-92] [root] Security audit + hardening**
  - **Target Files**: middleware files, auth files
  - **Prerequisites**: all prior tickets
  - **TDD Criteria**: Security grep: no `dangerouslySetInnerHTML` with raw AI content. No plaintext secrets in client bundle. Helmet active on all routes. CSRF active on all mutating routes. Rate-limit headers present on 429 responses. Ownership scoping verified (cross-user → 404). ACR-X-03.


---
Back to [TICKETS.md](../TICKETS.md)
