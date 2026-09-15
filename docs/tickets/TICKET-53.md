# TICKET-53 — [backend] AI routes

> **Phase 6: AI Service + SSE Streaming**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-53] [backend] AI routes**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/ai.routes.js`, `/home/harshil26r/Projects/story-builder/server/src/controllers/ai.controller.js`
  - **Prerequisites**: TICKET-52
  - **TDD Criteria**: Integration test: `POST /api/ai/generate-chapter` with valid body → SSE stream (Content-Type: text/event-stream). Unauthenticated → `401`. Missing ANTHROPIC_AUTH_TOKEN → events emit `error { code: 'AI_UNAVAILABLE' }`. ACR-B-12.


---
Back to [TICKETS.md](../TICKETS.md)
