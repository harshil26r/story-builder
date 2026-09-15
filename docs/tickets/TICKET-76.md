# TICKET-76 — [backend] Polish endpoint (ai/polish-draft)

> **Phase 10: AI-Enhanced Mode + Polish**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-76] [backend] Polish endpoint (ai/polish-draft)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/aiService.js` (edit: add `polishDraft`), `/home/harshil26r/Projects/story-builder/server/src/routes/ai.routes.js` (edit)
  - **Prerequisites**: TICKET-52, TICKET-50
  - **TDD Criteria**: Integration test: `POST /api/ai/polish-draft` with `{storyId, chapterIndex}` → SSE stream. Prompt uses `buildPolishPrompt`. Output replaces `chapter.content` (original saved as `draftContent`). Version bumped, snapshot pushed with `mode: 'user'` (user draft preserved). ACR-B-12.


---
Back to [TICKETS.md](../TICKETS.md)
