# TICKET-44 — [frontend] Story Zustand store

> **Phase 5: Story CRUD + Wizard**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-44] [frontend] Story Zustand store**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/store/storyStore.ts`
  - **Prerequisites**: TICKET-18
  - **TDD Criteria**: Unit test: `useStoryStore` actions: `fetchList()`, `fetchOne(id)`, `create(req)`, `update(id, patch, opts?)`, `remove(id)`, `publish(id, isPublic)`. `update` with `{ silent: true }` suppresses toast on success. 409 CONFLICT surfaces conflict state. ACR-F-08.


---
Back to [TICKETS.md](../TICKETS.md)
