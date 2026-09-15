# TICKET-35 — [frontend] Character Zustand store

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-35] [frontend] Character Zustand store**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/store/characterStore.ts`
  - **Prerequisites**: TICKET-18, TICKET-10
  - **TDD Criteria**: Unit test: `useCharacterStore` actions: `fetch()` loads characters, `create(input)` adds to list, `update(id, patch)` updates, `remove(id)` removes, `duplicate(id)` adds copy, `uploadAvatar(id, file)` updates avatarUrl. Status transitions: idle → loading → success/error. ACR-F-06.


---
Back to [TICKETS.md](../TICKETS.md)
