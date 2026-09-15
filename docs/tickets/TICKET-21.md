# TICKET-21 — [frontend] App routing + AppShell + TopNav

> **Phase 1: Session Auth (no OTP)**
> **Status**: :white_check_mark: done

- [x] **[TICKET-21] [frontend] App routing + AppShell + TopNav**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/App.tsx` (edit), `/home/harshil26r/Projects/story-builder/client/src/components/ui/AppShell.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/TopNav.tsx`
  - **Prerequisites**: TICKET-19, TICKET-20
  - **TDD Criteria**: Component test: `<App>` routes `/auth/login` to LoginForm, `/auth/signup` to SignupForm, `/` to placeholder DashboardPage. `AppShell` renders `TopNav` + children. `TopNav` shows user name when logged in, "Logout" button. Protected routes redirect to `/auth/login` when no session. Guest routes redirect to `/` when logged in.
  - **Verified/fixed**: New `src/tests/AppRouting.test.tsx` (5 tests) covers `/auth/login`→LoginForm, `/auth/signup`→SignupForm, `/` protected→redirect when no session, TopNav user-name + Logout when logged in, guest route→redirect to `/` when logged in. Fixes: `authStore` no-session status now `'empty'` so the gate redirects instead of spinning; `AuthGate` distinguishes checked (`empty`/`error`) from bootstrapping; `AuthGate` success branch wraps children in `AppShell` so `/` and dashboard pages get TopNav; `AppShell` sources `user`/`logout` from the auth store by default.




---
Back to [TICKETS.md](../TICKETS.md)
