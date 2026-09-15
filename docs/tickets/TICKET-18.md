# TICKET-18 — [frontend] HTTP client + CSRF integration

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-18] [frontend] HTTP client + CSRF integration**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/services/api.ts`
  - **Prerequisites**: TICKET-10, TICKET-06
  - **TDD Criteria**: Unit test: `http.post()` attaches `x-csrf-token` header from cookie on mutating verbs (POST/PUT/PATCH/DELETE). Non-2xx response throws `AppError` with code, message, fields. CSRF cookie is read on bootstrap.
  - **Verified**: `src/tests/httpClient.test.ts` (6 tests) covers CSRF attach on POST, no-header on GET, `noCsrf` skip, AppError `{code,message,fields}`, `getCookie`, `authApi.csrf` path. `src/tests/apiProxyIntegration.test.ts` (3 tests) covers relative URLs (`/api`, `/s`), 502/504 proxy → AppError with code + fallback message, and the 4-UI-state contract. `bootstrap.ts` reads the CSRF cookie on startup. All pass.


---
Back to [TICKETS.md](../TICKETS.md)
