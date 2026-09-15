# TICKET-11 — [backend] User + Session models (Mongoose)

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-11] [backend] User + Session models (Mongoose)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/models/User.js`, `/home/harshil26r/Projects/story-builder/server/src/models/OtpToken.js` (placeholder only, full in Phase 2)
  - **Prerequisites**: TICKET-04
  - **TDD Criteria**: Unit test: `User.create({name, email, password})` hashes password (bcrypt, `passwordHash` field is `bcrypt` hash not plaintext); `email` is unique-indexed (duplicate insert throws `MongoServerError` code 11000); `isEmailVerified` defaults `false`; `googleId` defaults `null`. ACR-B-01 (partial: User model only).


---
Back to [TICKETS.md](../TICKETS.md)
