# TICKET-19 — [frontend] Auth Zustand store

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-19] [frontend] Auth Zustand store**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/store/authStore.ts`
  - **Prerequisites**: TICKET-18
  - **TDD Criteria**: Unit test: `useAuthStore` actions: `bootstrap()` calls `GET /api/auth/me` and sets `user`. `login(email, password)` calls POST and sets user. `signup(name, email, password)` calls POST. `logout()` calls POST and clears user. `clearError()` resets error. Status transitions: idle → loading → success/error.
  - **Verified/fixed**: `src/tests/authStore.test.ts` (7 tests) covers bootstrap→user, bootstrap null→`empty`, login→me→user, signup, logout→clears, clearError, login failure→error. Fixed a real defect: bootstrap/logout with no session previously left `status:'idle'` (indistinguishable from not-yet-checked), which made route gates spin forever; they now set `status:'empty'` (checked, no session). Tests updated to assert `'empty'`.


---
Back to [TICKETS.md](../TICKETS.md)
