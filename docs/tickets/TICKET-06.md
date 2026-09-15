# TICKET-06 — [frontend] Vite 6 + React 19 client scaffold

> **Phase 0: Scaffold**
> **Status**: :white_check_mark: done

- [x] **[TICKET-06] [frontend] Vite 6 + React 19 client scaffold**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/vite.config.ts`, `/home/harshil26r/Projects/story-builder/client/tsconfig.json`, `/home/harshil26r/Projects/story-builder/client/index.html`, `/home/harshil26r/Projects/story-builder/client/src/main.tsx`, `/home/harshil26r/Projects/story-builder/client/src/App.tsx`, `/home/harshil26r/Projects/story-builder/client/src/index.css`
  - **Prerequisites**: TICKET-01
  - **TDD Criteria**: `npm run dev -w client` starts Vite on `:5173` with proxy config: `/api`, `/s`, `/uploads` proxied to `:5000`. `npm run build -w client` produces `dist/` with no TS errors. Client `fetch('/api/health')` through Vite proxy returns `{ ok: true }`.


---
Back to [TICKETS.md](../TICKETS.md)
