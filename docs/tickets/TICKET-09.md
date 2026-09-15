# TICKET-09 — [backend] Domain contracts: Joi schemas + ambient .d.ts

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-09] [backend] Domain contracts: Joi schemas + ambient .d.ts**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/validation/schemas.js`, `/home/harshil26r/Projects/story-builder/server/src/types/contracts.d.ts`
  - **Prerequisites**: TICKET-04
  - **TDD Criteria**: Unit test: `signupSchema.validate({...})` accepts valid payload per SPEC 2.2; rejects missing `email` with error `VALIDATION_ERROR` and `fields` array. `contracts.d.ts` declares the same shapes as SPEC 1 (User, OtpToken, Character, Story, Chapter, BranchNode). ACR-B-02.


---
Back to [TICKETS.md](../TICKETS.md)
