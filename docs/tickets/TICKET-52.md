# TICKET-52 — [backend] AI service: SSE streaming handler

> **Phase 6: AI Service + SSE Streaming**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-52] [backend] AI service: SSE streaming handler**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/aiService.js`
  - **Prerequisites**: TICKET-49, TICKET-50, TICKET-51, TICKET-42
  - **TDD Criteria**: Integration test: mock Claude API stream. `generateChapter()` emits events: `doc-start` (with jobId, storyId, chapterIndex, title) → `delta*` (text chunks) → `snapshot` (every 25 deltas, with fullTextSoFar) → `summary` → `done` (with saved chapter including _id, version, content, summary, totalChapters, wordCount). HTTP status stays 200 even on error. On AI provider failure: retry once (1s backoff), then `error { code: 'AI_UNAVAILABLE' }` + close. `AbortController` bound to `req.on('close')` kills orphan SSE. Rate-limit units = `1 + chaptersRegenerated`. ACR-B-12, ACR-B-16.


---
Back to [TICKETS.md](../TICKETS.md)
