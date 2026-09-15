# TICKET-78 — [backend] Export service (PDF + EPUB)

> **Phase 11: Export PDF + EPUB**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-78] [backend] Export service (PDF + EPUB)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/exportService.js`
  - **Prerequisites**: TICKET-42
  - **TDD Criteria**: Unit test: `toPdf(story, chapters)` returns `Buffer` starting with `%PDF`. Embeds serif font. Includes chapter headers, page numbers, TOC for linear stories. Drop caps on first letter. Margins 2cm. `toEpub(story, chapters)` returns `Buffer` that is valid zip containing `mimetype`, `content.opf`, `nav.xhtml`, chapter xhtml files, cover image. Empty/draft story → throws `StoryIncompleteError`. ACR-B-17, ACR-B-18.


---
Back to [TICKETS.md](../TICKETS.md)
