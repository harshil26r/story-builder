---
name: implement
description: Executes backend tickets in TICKETS.md using Test-Driven Development (TDD).
---

# TDD Implementation Workflow

Execute backend/service tickets with high reliability and zero regressions.

## Steps for Each Ticket:
1. **Red (Failing Test)**:
   - Create or update a test in `src/tests/` specifying the expected behavior.
   - Run `npm test` and verify that the test fails for the expected reason.
2. **Green (Minimal Code)**:
   - Write the simplest code in `src/services/` or `src/types/` that passes the test.
   - Re-run `npm test` and verify that all tests pass.
3. **Refactor**:
   - Clean up code, remove duplication, and ensure adherence to TypeScript best practices.
   - Verify tests remain green.
4. Check off the ticket in `TICKETS.md`.
