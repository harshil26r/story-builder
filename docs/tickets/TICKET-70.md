# TICKET-70 — [backend] BranchNode model

> **Phase 9: Branching**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-70] [backend] BranchNode model**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/models/BranchNode.js`
  - **Prerequisites**: TICKET-11
  - **TDD Criteria**: Unit test: `BranchNode.create({storyId, title, content, isStart: true})` succeeds. `choices` is array of `{_id, label, targetNodeId}`. `versions` is array of `ContentSnapshot`. `isStart` and `isEnding` are booleans. `parentId` optional. ACR-B-01.


---
Back to [TICKETS.md](../TICKETS.md)
