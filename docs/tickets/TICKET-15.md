# TICKET-15 — [backend] Validate middleware (celebrate/Joi)

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-15] [backend] Validate middleware (celebrate/Joi)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/middleware/validate.js`
  - **Prerequisites**: TICKET-09
  - **TDD Criteria**: Unit test: middleware with schema rejects payload missing required field → `400 { code: 'VALIDATION_ERROR', fields: [{field, message}] }` with `abortEarly: false` (all errors collected) and `stripUnknown: true`.


---
Back to [TICKETS.md](../TICKETS.md)
