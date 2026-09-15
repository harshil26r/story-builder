# TICKET-85 — [backend] Cover generation endpoint (ai/generate-cover)

> **Phase 13: Polish + Enhancements**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-85] [backend] Cover generation endpoint (ai/generate-cover)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/aiService.js` (edit: add `generateCover`), `/home/harshil26r/Projects/story-builder/server/src/routes/ai.routes.js` (edit)
  - **Prerequisites**: TICKET-52, TICKET-50, TICKET-30
  - **TDD Criteria**: Integration test: `POST /api/ai/generate-cover` with `{storyId, description?}` → `200 { imageUrl, altText }`. Uses `buildCoverPrompt`. Description stored on story. Image: AI-generated if configured, else themed placeholder SVG from description seed. Storage abstraction handles upload. ACR-X-04.


---
Back to [TICKETS.md](../TICKETS.md)
