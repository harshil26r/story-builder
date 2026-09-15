# TICKET-59 — [frontend] Regenerate UI (only/onward)

> **Phase 7: Consistency Chaining + Versions + Regenerate**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-59] [frontend] Regenerate UI (only/onward)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/stories/RegenerateDialog.tsx` (or inline in StoryEditor)
  - **Prerequisites**: TICKET-58, TICKET-54
  - **TDD Criteria**: Component test: dialog shows two options: "Regenerate this chapter only" and "Regenerate this chapter and all onward". Warns "Chapters after N may diverge" for onward mode. Passes `baseVersion` to prevent lost updates. Shows streaming progress during regeneration. ACR-F-10.




---
Back to [TICKETS.md](../TICKETS.md)
