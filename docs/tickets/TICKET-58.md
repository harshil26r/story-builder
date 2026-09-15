# TICKET-58 — [frontend] StoryEditor with autosave + conflict resolution

> **Phase 7: Consistency Chaining + Versions + Regenerate**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-58] [frontend] StoryEditor with autosave + conflict resolution**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/stories/StoryEditor.tsx`
  - **Prerequisites**: TICKET-44, TICKET-54
  - **TDD Criteria**: Component test: autosave debounce (800ms) calls `update(id, patch, { silent: true })`. 409 CONFLICT shows banner with "Open latest" / "Overwrite" options. "Open latest" reloads story. "Overwrite" sends `baseVersion: -1`. Edit/Read mode toggle present. ACR-F-10.


---
Back to [TICKETS.md](../TICKETS.md)
