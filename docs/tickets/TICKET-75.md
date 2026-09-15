# TICKET-75 — [backend] Branching AI generation (generate-node endpoint)

> **Phase 9: Branching**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-75] [backend] Branching AI generation (generate-node endpoint)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/aiService.js` (edit: add `generateNode`), `/home/harshil26r/Projects/story-builder/server/src/routes/ai.routes.js` (edit)
  - **Prerequisites**: TICKET-52, TICKET-71
  - **TDD Criteria**: Integration test: `POST /api/ai/generate-node` with `{storyId, parentNodeId}` → SSE stream. Emits `doc-start` with `nodeId`. Prompt includes character sheet + STORY SO FAR (from parent chain). AI output includes `[[CHOICE: label]]` markers parsed into choices. Choice parsing: exactly 2-4 choices extracted, each on final line. Choices attached to new node. ACR-B-12, ACR-B-13.




---
Back to [TICKETS.md](../TICKETS.md)
