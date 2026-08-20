# TICKET-03 — [root] Root scripts: dev + test + build

> **Phase 0: Scaffold**
> **Status**: :white_check_mark: done

- [x] **[TICKET-03] [root] Root scripts: dev + test + build**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/package.json` (edit)
  - **Prerequisites**: TICKET-01
  - **TDD Criteria**: `npm run dev` invokes `concurrently "npm:dev -w server" "npm:dev -w client"` (even if child scripts are stubs). `npm test` and `npm run build` are defined and run without error (even if they just echo "stub").


---
Back to [TICKETS.md](../TICKETS.md)
