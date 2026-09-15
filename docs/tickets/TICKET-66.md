# TICKET-66 — [frontend] BookReader + ReadingToolbar

> **Phase 8: Book UI + Design System**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-66] [frontend] BookReader + ReadingToolbar**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/book/BookReader.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/book/ReadingToolbar.tsx`
  - **Prerequisites**: TICKET-62, TICKET-63, TICKET-64, TICKET-65, TICKET-44
  - **TDD Criteria**: Component test: BookReader renders: BookCover → DisclaimerPage → IndexTable → ChapterPages with PageFlip. Structure-aware: `single` shows 1 chapter, `linear` shows N chapters, `branching` shows BranchingView instead. Read/Edit mode toggle. ReadingToolbar: Export PDF/EPUB buttons, Publish toggle, Delete button. `data-reading-mode="paper"` attribute present for paper mode. ACR-F-11, ACR-F-09.


---
Back to [TICKETS.md](../TICKETS.md)
