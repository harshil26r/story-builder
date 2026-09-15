# TICKET-29 — [frontend] Google auth button (env-gated)

> **Phase 3: Google OAuth**
> **Status**: :white_check_mark: done

- [x] **[TICKET-29] [frontend] Google auth button (env-gated)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/auth/GoogleAuthButton.tsx`
  - **Prerequisites**: TICKET-18
  - **TDD Criteria**: Component test: when `googleEnabled` is true (from bootstrap response), button renders with Google icon. When false, button is hidden. Clicking button redirects to `/api/auth/google`. Error from server (501) shows graceful message. ACR-F-05.




---
Back to [TICKETS.md](../TICKETS.md)
