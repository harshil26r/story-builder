# TICKET-20 — [frontend] Auth UI: LoginForm + SignupForm + AuthCard

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-20] [frontend] Auth UI: LoginForm + SignupForm + AuthCard**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/auth/AuthCard.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/auth/LoginForm.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/auth/SignupForm.tsx`
  - **Prerequisites**: TICKET-19
  - **TDD Criteria**: Component tests (Vitest + Testing Library): AuthCard renders login/signup modes. LoginForm: shows 4 states (loading → skeleton/spinner, empty → form, error → retry/error message, success → user redirected). SignupForm: same 4 states. a11y: `aria-label` on forms, `focus:ring-2` on inputs, keyboard-navigable. ACR-F-01, ACR-F-04.
  - **Verified**: `src/tests/authComponents.test.tsx` (7 tests) covers AuthCard login/signup modes + links, LoginForm a11y labels + submit through store + error alert, SignupForm fields + submit + navigate-to-verify. Loading = Button `aria-busy` spinner; empty = pristine form; error = `ErrorAlert` with retry; success = store/user transition (guest gate then redirects). Forms have `aria-label`, inputs `focus:ring-2 focus:ring-indigo-500/50`, `aria-required`.


---
Back to [TICKETS.md](../TICKETS.md)
