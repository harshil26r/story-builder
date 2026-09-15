# TICKET-50 — [backend] Prompt templates (pure functions)

> **Phase 6: AI Service + SSE Streaming**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-50] [backend] Prompt templates (pure functions)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/promptTemplates.js`
  - **Prerequisites**: none (pure functions)
  - **TDD Criteria**: Unit test: `buildSystemPrompt({genre, tone, audience, pov, structureType})` returns byte-identical output for same inputs (snapshot test). Output contains all sections in SPEC 6 order: WORLD & STYLE, PROSE RULES, STRUCTURE MODE, CONSISTENCY CONTRACT, CHARACTER SHEET. `buildCharacterSheet(characters)` serializes all fields, relationships resolve target names, omitted optional → `N/A`. `buildSummaryBlock(summaries)` caps at 5 entries. `buildChapterPrompt(...)` includes chapter index, summary block, word budget. `buildPolishPrompt(...)`, `buildCoverPrompt(...)` match SPEC 6.5/6.6. ACR-B-11.


---
Back to [TICKETS.md](../TICKETS.md)
