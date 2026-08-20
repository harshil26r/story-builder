# Story Builder — Engineering Tickets

> One ticket = one file under `docs/tickets/`. This index is generated and kept in sync.
> Every ticket is atomic, sequentially orderable, and cross-referenced to acceptance criteria (ACR-B-*, ACR-F-*, ACR-X-*) and to `docs/SPEC.md`.

## Phase 0: Scaffold

- :white_check_mark: [01] [`TICKET-01.md`](tickets/TICKET-01.md) — [root] npm workspaces scaffold
- :white_check_mark: [02] [`TICKET-02.md`](tickets/TICKET-02.md) — [root] .env.example with full env contract
- :white_check_mark: [03] [`TICKET-03.md`](tickets/TICKET-03.md) — [root] Root scripts: dev + test + build
- :white_check_mark: [04] [`TICKET-04.md`](tickets/TICKET-04.md) — [backend] MongoDB connection config
- :white_check_mark: [05] [`TICKET-05.md`](tickets/TICKET-05.md) — [backend] Express entry point + health route
- :ballot_box_with_check: [06] [`TICKET-06.md`](tickets/TICKET-06.md) — [frontend] Vite 6 + React 19 client scaffold
- :ballot_box_with_check: [07] [`TICKET-07.md`](tickets/TICKET-07.md) — [root] Vitest + Testing Library setup
- :white_check_mark: [08] [`TICKET-08.md`](tickets/TICKET-08.md) — [root] docs/ARCHITECTURE.md initial

## Phase 1: Session Auth (no OTP)

- :white_check_mark: [09] [`TICKET-09.md`](tickets/TICKET-09.md) — [backend] Domain contracts: Joi schemas + ambient .d.ts
- :ballot_box_with_check: [10] [`TICKET-10.md`](tickets/TICKET-10.md) — [frontend] Authoritative TS domain contracts
- :white_check_mark: [11] [`TICKET-11.md`](tickets/TICKET-11.md) — [backend] User + Session models (Mongoose)
- :white_check_mark: [12] [`TICKET-12.md`](tickets/TICKET-12.md) — [backend] Session config (express-session + connect-mongo)
- :white_check_mark: [13] [`TICKET-13.md`](tickets/TICKET-13.md) — [backend] Rate limit middleware
- :white_check_mark: [14] [`TICKET-14.md`](tickets/TICKET-14.md) — [backend] CSRF double-submit middleware
- :white_check_mark: [15] [`TICKET-15.md`](tickets/TICKET-15.md) — [backend] Validate middleware (celebrate/Joi)
- :white_check_mark: [16] [`TICKET-16.md`](tickets/TICKET-16.md) — [backend] Auth middleware (authGuard + optionalAuth)
- :ballot_box_with_check: [17] [`TICKET-17.md`](tickets/TICKET-17.md) — [backend] Auth service + routes (signup, login, logout, me — no OTP yet)
- :ballot_box_with_check: [18] [`TICKET-18.md`](tickets/TICKET-18.md) — [frontend] HTTP client + CSRF integration
- :ballot_box_with_check: [19] [`TICKET-19.md`](tickets/TICKET-19.md) — [frontend] Auth Zustand store
- :ballot_box_with_check: [20] [`TICKET-20.md`](tickets/TICKET-20.md) — [frontend] Auth UI: LoginForm + SignupForm + AuthCard
- :ballot_box_with_check: [21] [`TICKET-21.md`](tickets/TICKET-21.md) — [frontend] App routing + AppShell + TopNav

## Phase 2: OTP Module + Email

- :ballot_box_with_check: [22] [`TICKET-22.md`](tickets/TICKET-22.md) — [backend] OtpToken model (full)
- :ballot_box_with_check: [23] [`TICKET-23.md`](tickets/TICKET-23.md) — [backend] Mailer config (SMTP or console fallback)
- :ballot_box_with_check: [24] [`TICKET-24.md`](tickets/TICKET-24.md) — [backend] OTP service (send, verify, resend cooldown, lockout)
- :ballot_box_with_check: [25] [`TICKET-25.md`](tickets/TICKET-25.md) — [backend] Auth routes: OTP endpoints (send-otp, verify-otp, reset-password)
- :ballot_box_with_check: [26] [`TICKET-26.md`](tickets/TICKET-26.md) — [frontend] OtpVerification component

## Phase 3: Google OAuth

- :ballot_box_with_check: [27] [`TICKET-27.md`](tickets/TICKET-27.md) — [backend] Passport config (local + google strategies)
- :ballot_box_with_check: [28] [`TICKET-28.md`](tickets/TICKET-28.md) — [backend] Google OAuth routes + account linking
- :ballot_box_with_check: [29] [`TICKET-29.md`](tickets/TICKET-29.md) — [frontend] Google auth button (env-gated)

## Phase 4: Character CRUD + Storage

- :white_check_mark: [30] [`TICKET-30.md`](tickets/TICKET-30.md) — [backend] Storage abstraction (Cloudinary-or-local)
- :ballot_box_with_check: [31] [`TICKET-31.md`](tickets/TICKET-31.md) — [backend] Upload routes
- :ballot_box_with_check: [32] [`TICKET-32.md`](tickets/TICKET-32.md) — [backend] Character model
- :ballot_box_with_check: [33] [`TICKET-33.md`](tickets/TICKET-33.md) — [backend] Character service
- :ballot_box_with_check: [34] [`TICKET-34.md`](tickets/TICKET-34.md) — [backend] Character routes + controller
- :ballot_box_with_check: [35] [`TICKET-35.md`](tickets/TICKET-35.md) — [frontend] Character Zustand store
- :ballot_box_with_check: [36] [`TICKET-36.md`](tickets/TICKET-36.md) — [frontend] UI primitives: AsyncState, Spinner, Skeleton, ErrorAlert, EmptyState, Button, Modal, ConfirmDialog
- :ballot_box_with_check: [37] [`TICKET-37.md`](tickets/TICKET-37.md) — [frontend] CharactersDashboard + CharacterCard
- :ballot_box_with_check: [38] [`TICKET-38.md`](tickets/TICKET-38.md) — [frontend] CharacterForm + CharacterRelationshipsEditor
- :ballot_box_with_check: [39] [`TICKET-39.md`](tickets/TICKET-39.md) — [frontend] AvatarUploader
- :ballot_box_with_check: [40] [`TICKET-40.md`](tickets/TICKET-40.md) — [frontend] Character routing + page shell

## Phase 5: Story CRUD + Wizard

- :ballot_box_with_check: [41] [`TICKET-41.md`](tickets/TICKET-41.md) — [backend] Story + Chapter models
- :ballot_box_with_check: [42] [`TICKET-42.md`](tickets/TICKET-42.md) — [backend] Story service (CRUD, publish, word count)
- :ballot_box_with_check: [43] [`TICKET-43.md`](tickets/TICKET-43.md) — [backend] Story routes + controller
- :ballot_box_with_check: [44] [`TICKET-44.md`](tickets/TICKET-44.md) — [frontend] Story Zustand store
- :ballot_box_with_check: [45] [`TICKET-45.md`](tickets/TICKET-45.md) — [frontend] StoriesDashboard
- :ballot_box_with_check: [46] [`TICKET-46.md`](tickets/TICKET-46.md) — [frontend] StoryWizard step components (Premise, Settings, Characters)
- :ballot_box_with_check: [47] [`TICKET-47.md`](tickets/TICKET-47.md) — [frontend] StoryWizard step components (Generate + Complete)
- :ballot_box_with_check: [48] [`TICKET-48.md`](tickets/TICKET-48.md) — [frontend] Story routing + dashboard page shell

## Phase 6: AI Service + SSE Streaming

- :ballot_box_with_check: [49] [`TICKET-49.md`](tickets/TICKET-49.md) — [backend] AI config (Claude client)
- :ballot_box_with_check: [50] [`TICKET-50.md`](tickets/TICKET-50.md) — [backend] Prompt templates (pure functions)
- :ballot_box_with_check: [51] [`TICKET-51.md`](tickets/TICKET-51.md) — [backend] AI rate limit + cost guard middleware
- :ballot_box_with_check: [52] [`TICKET-52.md`](tickets/TICKET-52.md) — [backend] AI service: SSE streaming handler
- :ballot_box_with_check: [53] [`TICKET-53.md`](tickets/TICKET-53.md) — [backend] AI routes
- :ballot_box_with_check: [54] [`TICKET-54.md`](tickets/TICKET-54.md) — [frontend] SSE client + Generation Zustand store

## Phase 7: Consistency Chaining + Versions + Regenerate

- :ballot_box_with_check: [55] [`TICKET-55.md`](tickets/TICKET-55.md) — [backend] Version snapshots + consistency chaining in storyService
- :ballot_box_with_check: [56] [`TICKET-56.md`](tickets/TICKET-56.md) — [backend] Resume + token overflow handling
- :ballot_box_with_check: [57] [`TICKET-57.md`](tickets/TICKET-57.md) — [backend] Regenerate + continue endpoints
- :ballot_box_with_check: [58] [`TICKET-58.md`](tickets/TICKET-58.md) — [frontend] StoryEditor with autosave + conflict resolution
- :ballot_box_with_check: [59] [`TICKET-59.md`](tickets/TICKET-59.md) — [frontend] Regenerate UI (only/onward)

## Phase 8: Book UI + Design System

- :ballot_box_with_check: [60] [`TICKET-60.md`](tickets/TICKET-60.md) — [root] Design tokens (tokens.css)
- :ballot_box_with_check: [61] [`TICKET-61.md`](tickets/TICKET-61.md) — [frontend] AppShell + TopNav (full, with design tokens)
- :ballot_box_with_check: [62] [`TICKET-62.md`](tickets/TICKET-62.md) — [frontend] BookCover + DisclaimerPage
- :ballot_box_with_check: [63] [`TICKET-63.md`](tickets/TICKET-63.md) — [frontend] IndexTable
- :ballot_box_with_check: [64] [`TICKET-64.md`](tickets/TICKET-64.md) — [frontend] ChapterPage (drop caps, justified serif, page numbers)
- :ballot_box_with_check: [65] [`TICKET-65.md`](tickets/TICKET-65.md) — [frontend] PageFlip (framer-motion 3D)
- :ballot_box_with_check: [66] [`TICKET-66.md`](tickets/TICKET-66.md) — [frontend] BookReader + ReadingToolbar
- :ballot_box_with_check: [67] [`TICKET-67.md`](tickets/TICKET-67.md) — [frontend] GenerateStep (live streaming UI)
- :ballot_box_with_check: [68] [`TICKET-68.md`](tickets/TICKET-68.md) — [frontend] Toast system + ToastHost
- :ballot_box_with_check: [69] [`TICKET-69.md`](tickets/TICKET-69.md) — [frontend] Book routing + pages

## Phase 9: Branching

- :ballot_box_with_check: [70] [`TICKET-70.md`](tickets/TICKET-70.md) — [backend] BranchNode model
- :ballot_box_with_check: [71] [`TICKET-71.md`](tickets/TICKET-71.md) — [backend] Node service (CRUD + graph invariants)
- :ballot_box_with_check: [72] [`TICKET-72.md`](tickets/TICKET-72.md) — [backend] Node routes + controller
- :ballot_box_with_check: [73] [`TICKET-73.md`](tickets/TICKET-73.md) — [frontend] BranchState Zustand store
- :ballot_box_with_check: [74] [`TICKET-74.md`](tickets/TICKET-74.md) — [frontend] BranchingView (graph + node CRUD + choices)
- :ballot_box_with_check: [75] [`TICKET-75.md`](tickets/TICKET-75.md) — [backend] Branching AI generation (generate-node endpoint)

## Phase 10: AI-Enhanced Mode + Polish

- :ballot_box_with_check: [76] [`TICKET-76.md`](tickets/TICKET-76.md) — [backend] Polish endpoint (ai/polish-draft)
- :ballot_box_with_check: [77] [`TICKET-77.md`](tickets/TICKET-77.md) — [frontend] Draft editor + polish streaming + diff view

## Phase 11: Export PDF + EPUB

- :ballot_box_with_check: [78] [`TICKET-78.md`](tickets/TICKET-78.md) — [backend] Export service (PDF + EPUB)
- :ballot_box_with_check: [79] [`TICKET-79.md`](tickets/TICKET-79.md) — [backend] Export routes
- :ballot_box_with_check: [80] [`TICKET-80.md`](tickets/TICKET-80.md) — [frontend] Export buttons + download

## Phase 12: Sharing + Public Reader

- :ballot_box_with_check: [81] [`TICKET-81.md`](tickets/TICKET-81.md) — [backend] Share routes (publish + public projection)
- :ballot_box_with_check: [82] [`TICKET-82.md`](tickets/TICKET-82.md) — [frontend] PublicReader component
- :ballot_box_with_check: [83] [`TICKET-83.md`](tickets/TICKET-83.md) — [frontend] Publish button + share dialog
- :ballot_box_with_check: [84] [`TICKET-84.md`](tickets/TICKET-84.md) — [frontend] Public route + 404 page

## Phase 13: Polish + Enhancements

- :ballot_box_with_check: [85] [`TICKET-85.md`](tickets/TICKET-85.md) — [backend] Cover generation endpoint (ai/generate-cover)
- :ballot_box_with_check: [86] [`TICKET-86.md`](tickets/TICKET-86.md) — [frontend] CoverArtGenerator component
- :ballot_box_with_check: [87] [`TICKET-87.md`](tickets/TICKET-87.md) — [frontend] Genre font presets + reading mode toggle
- :ballot_box_with_check: [88] [`TICKET-88.md`](tickets/TICKET-88.md) — [frontend] Choose-your-path public reader (branching)
- :ballot_box_with_check: [89] [`TICKET-89.md`](tickets/TICKET-89.md) — [frontend] Global a11y audit + focus management

## Phase 14: Review + Harden

- :ballot_box_with_check: [90] [`TICKET-90.md`](tickets/TICKET-90.md) — [root] npm test harden — zero failures
- :ballot_box_with_check: [91] [`TICKET-91.md`](tickets/TICKET-91.md) — [root] npm run build — clean in both workspaces
- :ballot_box_with_check: [92] [`TICKET-92.md`](tickets/TICKET-92.md) — [root] Security audit + hardening
- :ballot_box_with_check: [93] [`TICKET-93.md`](tickets/TICKET-93.md) — [root] Graceful degradation verification
- :ballot_box_with_check: [94] [`TICKET-94.md`](tickets/TICKET-94.md) — [root] docs/ARCHITECTURE.md update + README

---

## Summary

| Metric | Count |
|---|---|
| Total tickets | 94 |
| Done | 13 |
| Pending | 81 |
