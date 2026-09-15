# TICKET-74 — [frontend] BranchingView (graph + node CRUD + choices)

> **Phase 9: Branching**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-74] [frontend] BranchingView (graph + node CRUD + choices)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/branching/BranchingView.tsx`
  - **Prerequisites**: TICKET-73, TICKET-36, TICKET-54
  - **TDD Criteria**: Component test: renders node cards with choice edges (lines/arrows). Node expand shows content with page-flip transition. Add/delete node buttons. Add/remove choice per node. Orphan edges flagged (visual warning when `targetNodeId` is null). Generate node button starts SSE streaming. Selected node highlighted with `border-l-4 border-l-indigo-500 bg-indigo-500/10`. Child count metadata shown. 4-state compliant. ACR-F-12.


---
Back to [TICKETS.md](../TICKETS.md)
