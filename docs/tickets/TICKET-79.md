# TICKET-79 — [backend] Export routes

> **Phase 11: Export PDF + EPUB**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-79] [backend] Export routes**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/export.routes.js`, `/home/harshil26r/Projects/story-builder/server/src/controllers/export.controller.js`
  - **Prerequisites**: TICKET-78, TICKET-16
  - **TDD Criteria**: Integration test: `GET /api/stories/:id/export/pdf` with complete story → `200` with `Content-Type: application/pdf` and `Content-Disposition: attachment`. Empty story → `409 STORY_INCOMPLETE`. EPUB: same pattern with `application/epub+zip`. Unauthenticated → `401`. ACR-B-17, ACR-B-18.


---
Back to [TICKETS.md](../TICKETS.md)
