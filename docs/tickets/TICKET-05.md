# TICKET-05 — [backend] Express entry point + health route

> **Phase 0: Scaffold**
> **Status**: :white_check_mark: done

- [x] **[TICKET-05] [backend] Express entry point + health route**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/index.js`
  - **Prerequisites**: TICKET-04
  - **TDD Criteria**: Integration test: start server on test port, `GET /api/health` returns `200 { ok: true, timestamp }`. Server reads `PORT` env (default 5000). `npm run dev -w server` boots without crash.


---
Back to [TICKETS.md](../TICKETS.md)
