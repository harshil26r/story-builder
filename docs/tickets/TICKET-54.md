# TICKET-54 — [frontend] SSE client + Generation Zustand store

> **Phase 6: AI Service + SSE Streaming**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-54] [frontend] SSE client + Generation Zustand store**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/services/sse.ts`, `/home/harshil26r/Projects/story-builder/client/src/store/generationStore.ts`
  - **Prerequisites**: TICKET-18
  - **TDD Criteria**: Unit test: `streamSSE()` reads `fetch` response body as ReadableStream, parses `event:/data:` framing, calls `onDelta(text)` for each delta. `AbortSignal` stops the stream. `generationStore`: `start(route, storyId, payload)` calls SSE, appends deltas to `fullText`. `resume()` re-POSTs with `resumeGenerationId` from snapshot. `abort()` aborts via AbortController. Status: idle → streaming → done/error. Delta append is string-concat-safe (no surrogate-pair splitting). ACR-F-13.




---
Back to [TICKETS.md](../TICKETS.md)
