# TICKET-28 — [backend] Google OAuth routes + account linking

> **Phase 3: Google OAuth**
> **Status**: :white_check_mark: done

- [x] **[TICKET-28] [backend] Google OAuth routes + account linking**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/auth.routes.js` (edit), `/home/harshil26r/Projects/story-builder/server/src/controllers/auth.controller.js` (edit)
  - **Prerequisites**: TICKET-27, TICKET-25
  - **TDD Criteria**: Integration test: `GET /api/auth/google` with creds absent → `501 NOT_CONFIGURED`. With creds → 302 redirect. `POST /api/auth/link-google` with session + valid token → `200 { ok: true }` + googleId attached to user. Existing passwordHash not clobbered (dual-auth). Already linked → `409 ACCOUNT_ALREADY_LINKED`. ACR-B-07.
  - **Verification**: `server/src/tests/googleAuth.test.js` (10 tests) passes: env unset → google*/link-google 501 NOT_CONFIGURED, me.googleEnabled=false; env set → /google 302→Google, me.googleEnabled=true, link-google with real RS256 id_token → 200 (googleId attached, bcrypt passwordHash preserved), duplicate → 409 ACCOUNT_ALREADY_LINKED, wrong-key token → 400, unauthenticated → 401. AuthMeResponse extended with `googleEnabled` (controller `me` + contracts.d.ts). Verified via `npx vitest run` (86 server tests green).


---
Back to [TICKETS.md](../TICKETS.md)
