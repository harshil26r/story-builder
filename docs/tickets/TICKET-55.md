# TICKET-55 — [backend] Version snapshots + consistency chaining in storyService

> **Phase 7: Consistency Chaining + Versions + Regenerate**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-55] [backend] Version snapshots + consistency chaining in storyService**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/storyService.js` (edit), `/home/harshil26r/Projects/story-builder/server/src/services/aiService.js` (edit)
  - **Prerequisites**: TICKET-52, TICKET-42
  - **TDD Criteria**: Unit test: after chapter generation, `versions[]` is pushed with `{version, content, summary, modifiedAt, mode}`. `doc.version === max(versions[].version)`. Retention cap `CONTENT_VERSION_RETENTION` (default 10) drops oldest. Summary chaining: `buildSummaryBlock` caps at last 5 entries. On regenerate-only chapter N: chapters 1..N-1 summaries unchanged, N regenerated, N+1..end summaries stay. On regenerate-onward from N: N..end regenerated with fresh summaries. ACR-B-13, ACR-B-04.


---
Back to [TICKETS.md](../TICKETS.md)
