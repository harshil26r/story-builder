# TICKET-32 — [backend] Character model

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-32] [backend] Character model**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/models/Character.js`
  - **Prerequisites**: TICKET-11
  - **TDD Criteria**: Unit test: `Character.create({userId, name, role, ...})` succeeds with all fields from SPEC 1. `personality` capped at 12 items, each ≤100 chars. `catchphrases` capped at 6 items. `relationships` is array of `{characterId, relationType}`. `isTemplate` defaults false. `userId` is indexed. ACR-B-01.


---
Back to [TICKETS.md](../TICKETS.md)
