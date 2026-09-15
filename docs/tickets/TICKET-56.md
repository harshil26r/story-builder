# TICKET-56 — [backend] Resume + token overflow handling

> **Phase 7: Consistency Chaining + Versions + Regenerate**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-56] [backend] Resume + token overflow handling**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/aiService.js` (edit)
  - **Prerequisites**: TICKET-55
  - **TDD Criteria**: Integration test: mid-stream disconnect → client re-POSTs with `resumeGenerationId` → server replays `doc-start` + `snapshot(currentBuffer)` + continues stream. Second resume attempt → `error { code: 'RESUME_EXHAUSTED' }`. Token overflow: when `max_tokens` truncates, server splits and continues in follow-up call; final `done` reports merged content. ACR-B-14, ACR-B-15.


---
Back to [TICKETS.md](../TICKETS.md)
