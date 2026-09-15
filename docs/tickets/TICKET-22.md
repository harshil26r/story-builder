# TICKET-22 — [backend] OtpToken model (full)

> **Phase 2: OTP Module + Email**
> **Status**: :white_check_mark: done

- [x] **[TICKET-22] [backend] OtpToken model (full)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/models/OtpToken.js` (replace stub)
  - **Prerequisites**: TICKET-04
  - **TDD Criteria**: Unit test: `OtpToken.create({email, otpCodeHash, purpose, expiresAt})` succeeds; TTL index on `expiresAt` is present (Mongo `listIndexes`); `attempts` defaults to 0; `email` is indexed. ACR-B-01.


---
Back to [TICKETS.md](../TICKETS.md)
