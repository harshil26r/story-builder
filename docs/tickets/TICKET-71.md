# TICKET-71 — [backend] Node service (CRUD + graph invariants)

> **Phase 9: Branching**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-71] [backend] Node service (CRUD + graph invariants)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/storyService.js` (edit: add node methods), or separate `/home/harshil26r/Projects/story-builder/server/src/services/nodeService.js`
  - **Prerequisites**: TICKET-70, TICKET-42
  - **TDD Criteria**: Unit test: graph invariants enforced. First node in branching story auto-created with `isStart: true`. Non-start node must have exactly one `parentId`. Acyclic check: cycle creation → error. `isEnding` node must have 0 choices; non-ending scene must have >= 1 choice (except draft). Node delete cascades: incoming edges' `targetNodeId → null`, returns `orphanedChoices` count. Choice label 2..80 chars, max 6 choices per node. `baseVersion` optimistic concurrency on content updates. ACR-B-04.


---
Back to [TICKETS.md](../TICKETS.md)
