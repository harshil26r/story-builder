# TICKET-81 — [backend] Share routes (publish + public projection)

> **Phase 12: Sharing + Public Reader**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-81] [backend] Share routes (publish + public projection)**
  - **Target Files**: already partially in TICKET-43; this ticket ensures full public projection logic
  - **Prerequisites**: TICKET-43
  - **TDD Criteria**: Integration test: `POST /api/stories/:id/publish` with `isPublic: true` → returns `{ isPublic: true, shareToken }`. `GET /s/:shareToken` → `200` StoryDetailResponse with no `versions`, no `draftContent`, no user PII (no `userId`, no `avatarUrl`). `isPublic: false` → clears shareToken. Invalid/expired token → `404`. ACR-B-19.


---
Back to [TICKETS.md](../TICKETS.md)
