# TICKET-07 — [root] Vitest + Testing Library setup

> **Phase 0: Scaffold**
> **Status**: :white_check_mark: done

- [x] **[TICKET-07] [root] Vitest + Testing Library setup**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/package.json` (add vitest dev-dep + test script), `/home/harshil26r/Projects/story-builder/client/src/tests/setup.ts`, `/home/harshil26r/Projects/story-builder/client/vitest.config.ts` (or extend vite.config.ts)
  - **Prerequisites**: TICKET-05, TICKET-06
  - **TDD Criteria**: Server: `npm test -w server` runs vitest and exits 0 with a sample `describe`/`it` passing. Client: `npm test -w client` runs vitest + testing-library and exits 0. Root: `npm test` runs both sequentially and exits 0.


---
Back to [TICKETS.md](../TICKETS.md)
