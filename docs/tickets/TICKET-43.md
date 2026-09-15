# TICKET-43 — [backend] Story routes + controller

> **Phase 5: Story CRUD + Wizard**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-43] [backend] Story routes + controller**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/story.routes.js`, `/home/harshil26r/Projects/story-builder/server/src/controllers/story.controller.js`
  - **Prerequisites**: TICKET-42, TICKET-16
  - **TDD Criteria**: Integration test: all endpoints per SPEC 3.2 respond correctly. `GET /api/stories` returns list. `POST /api/stories` creates draft. `GET /api/stories/:id` includes chapters/nodes. `PUT /api/stories/:id` with baseVersion mismatch → `409 CONFLICT`. `DELETE /api/stories/:id` cascades. `POST /api/stories/:id/publish` returns `shareToken`. `GET /s/:shareToken` returns public projection (no PII, no versions, no draftContent). Invalid shareToken → `404`. ACR-B-04, ACR-B-19.


---
Back to [TICKETS.md](../TICKETS.md)
