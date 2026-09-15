# TICKET-73 — [frontend] BranchState Zustand store

> **Phase 9: Branching**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-73] [frontend] BranchState Zustand store**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/store/branchStore.ts`
  - **Prerequisites**: TICKET-18
  - **TDD Criteria**: Unit test: `useBranchStore` actions: `fetch(storyId)` loads nodes + computes edges. `select(id)`. `addNode(storyId, parentId?)`. `updateNode(node, patch)`. `deleteNode(id)`. `addChoice(nodeId, label)`. `removeChoice(nodeId, choiceId)`. `generateNode(storyId, parentId?)` (starts SSE). Edge computation: from choices array, edges = `{from: node._id, to: choice.targetNodeId, label}`. ACR-F-12.


---
Back to [TICKETS.md](../TICKETS.md)
