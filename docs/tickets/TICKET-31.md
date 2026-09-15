# TICKET-31 — [backend] Upload routes

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-31] [backend] Upload routes**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/upload.routes.js`, `/home/harshil26r/Projects/story-builder/server/src/controllers/upload.controller.js`
  - **Prerequisites**: TICKET-30, TICKET-16
  - **TDD Criteria**: Integration test: `POST /api/upload` with multipart `file` field + `folder` → `200 { url: '...' }`. File > 5MB → `413`. Non-image on avatar folder → `400 INVALID_FILE`. Unauthenticated → `401`. ACR-B-09.


---
Back to [TICKETS.md](../TICKETS.md)
