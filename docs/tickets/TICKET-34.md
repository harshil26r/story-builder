# TICKET-34 — [backend] Character routes + controller

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-34] [backend] Character routes + controller**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/character.routes.js`, `/home/harshil26r/Projects/story-builder/server/src/controllers/character.controller.js`
  - **Prerequisites**: TICKET-33, TICKET-16, TICKET-31
  - **TDD Criteria**: Integration test: all 6 endpoints respond correctly per SPEC 3.2. `GET /api/characters` returns session-scoped characters. Cross-user character access → `404 NOT_FOUND` (never 403). `POST /api/characters/:id/avatar` with multipart file → `200 { avatarUrl }`. ACR-B-03.


---
Back to [TICKETS.md](../TICKETS.md)
