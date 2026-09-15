# TICKET-27 — [backend] Passport config (local + google strategies)

> **Phase 3: Google OAuth**
> **Status**: :white_check_mark: done

- [x] **[TICKET-27] [backend] Passport config (local + google strategies)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/config/passport.js`
  - **Prerequisites**: TICKET-12, TICKET-11
  - **TDD Criteria**: Unit test: `passport.js` exports an initialized passport instance. Local strategy validates email/password against User model. Google strategy is registered only when `GOOGLE_CLIENT_ID` is set; when absent, google strategy is not registered and google routes return `501 NOT_CONFIGURED`. ACR-B-07.
  - **Verification**: `server/src/tests/passport.test.js` (7 tests) passes; local strategy authenticates correct creds via User model, rejects wrong password/unknown email; google strategy registered iff `clientID` present (`createPassport` factory); google verify find-or-create + dual-auth (passwordHash preserved) covered. Verified via `npx vitest run` (86 server tests green).


---
Back to [TICKETS.md](../TICKETS.md)
