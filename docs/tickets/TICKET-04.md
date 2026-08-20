# TICKET-04 — [backend] MongoDB connection config

> **Phase 0: Scaffold**
> **Status**: :white_check_mark: done

- [x] **[TICKET-04] [backend] MongoDB connection config**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/config/db.js`
  - **Prerequisites**: TICKET-01
  - **TDD Criteria**: Unit test: `connectDB()` with `MONGO_URI` env var calls `mongoose.connect(uri)` and returns; when `MONGO_URI` unset defaults to `mongodb://127.0.0.1/story-builder`; on connection failure logs error and calls `process.exit(1)`.


---
Back to [TICKETS.md](../TICKETS.md)
