# TICKET-33 — [backend] Character service

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-33] [backend] Character service**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/characterService.js`
  - **Prerequisites**: TICKET-32
  - **TDD Criteria**: Unit test: `list(userId)` returns only that user's characters. `create(userId, input)` creates and returns Character. `update(userId, id, input)` updates and returns; throws `NotFoundError` for wrong user. `remove(userId, id)` deletes; wrong user → `NotFoundError` (not 403). `duplicate(userId, id)` creates copy named `<Name> (Copy)`. `attachAvatar(userId, id, url)` sets `avatarUrl`. ACR-B-03 (ownership scoping).


---
Back to [TICKETS.md](../TICKETS.md)
