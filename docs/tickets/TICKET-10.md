# TICKET-10 — [frontend] Authoritative TS domain contracts

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-10] [frontend] Authoritative TS domain contracts**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/types/domain.ts`, `/home/harshil26r/Projects/story-builder/client/src/types/api.ts`
  - **Prerequisites**: none (pure types)
  - **TDD Criteria**: File compiles (`tsc --noEmit`); every interface and type from SPEC 1 is present. `api.ts` exports `Ok`, `ErrorBody`, all request/response types from SPEC 2. ACR-B-02 (server mirrors), ACR-F-01 (client uses these).
  - **Verified**: `npx tsc -b --noEmit` exits 0. `domain.ts` covers all SPEC §1 primitives/entities incl. `AsyncStatus`, `FieldError`, `AppError`, SSE event types, `BranchEdge`. `api.ts` exports `Ok`, `ErrorBody`, and all §2 request/response types (`SignupRequest`, `LoginRequest`, `AuthMeResponse`, `CharacterInput`, `StoryCreateRequest`, `Node*Request`, `*Response`, etc.). `src/tests/domainContracts.test.ts` passes. Server mirror confirmed: `server/src/types/contracts.d.ts` (all §1 shapes) + `server/src/validation/schemas.js` (all §2 request shapes + rules) — ACR-B-02 intact, no changes.


---
Back to [TICKETS.md](../TICKETS.md)
