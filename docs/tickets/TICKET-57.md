# TICKET-57 — [backend] Regenerate + continue endpoints

> **Phase 7: Consistency Chaining + Versions + Regenerate**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-57] [backend] Regenerate + continue endpoints**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/story.routes.js` (edit: add `POST /:id/regenerate-chapter`, `POST /:id/continue`), `/home/harshil26r/Projects/story-builder/server/src/controllers/story.controller.js` (edit)
  - **Prerequisites**: TICKET-55, TICKET-53
  - **TDD Criteria**: Integration test: `POST /api/stories/:id/regenerate-chapter` with `{chapterId, mode: 'only'}` → SSE stream. `mode: 'onward'` → SSE stream that regenerates N..end. `POST /api/stories/:id/continue` with `{chaptersCount}` → SSE stream appending new chapters. StructureType validation: branching stories reject `regenerate-chapter` → `400`. ACR-B-13.


---
Back to [TICKETS.md](../TICKETS.md)
