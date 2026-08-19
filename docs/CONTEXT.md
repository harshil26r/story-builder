# Story Builder — CONTEXT.md

## 1. Product Definition

**Story Builder** is a full-stack MERN web app. Users design richly-detailed characters, give a rough story idea, and the app generates a complete multi-chapter story using those characters via the Anthropic Claude API. The UI is styled like a physical book: cover page, index/table of contents, chapters as pages, disclaimer page, page-turn animations.

### MVP = FULL SPEC. Nothing deferred.

User explicitly chose: build ALL 8 phases, all 6 core features, all suggested additions materialized for v1.

## 2. Confirmed Decisions (user-approved)

| Decision | Choice |
|---|---|
| Build scope | **FULL SPEC** — all phases/features |
| Auth | Email/password + OTP verification **+ Google OAuth** (passport-google-oauth20) |
| Session | Express-session + connect-mongo (store in Mongo, survives restarts) |
| File storage | **Cloudinary** (official `cloudinary` SDK, w/ `CLOUDINARY_URL` env) |
| Story structures | **ALL THREE**, user picks per-story: single / linear / branching(non-linear) |
| Monorepo | **npm workspaces**, single root `node_modules` (client + server hoisted) |
| Dev runner | **concurrently** runs Vite + Express in one root `dev` command |
| AI generation | Claude API via `ANTHROPIC_AUTH_TOKEN` (env already set) |
| AI flow | chapter-by-chapter streaming via SSE, consistency chaining |
| Export | PDF (pdf-lib) + EPUB (epub-gen) |

### Non-negotiable build constraints (user-explicit)
1. **npm workspaces**, root `package.json` with `"workspaces": ["client", "server"]`. ONE root `node_modules`. No nested node_modules.
2. `dev` script uses **concurrently** to run Vite + Express together from root.
3. **Cloudinary** is THE file-storage SDK. Config via `CLOUDINARY_URL`.
4. All three structure types fully supported. Branching is NOT deferred.

## 3. Environment Facts (verified)

- `ANTHROPIC_AUTH_TOKEN` set (NOT `ANTHROPIC_API_KEY`) → use for Claude API.
- `ANTHROPIC_BASE_URL` set.
- NO `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- NO `CLOUDINARY_URL`.
- NO SMTP creds.
- No Mongo URI in env (connect to `mongodb://127.0.0.1/story-builder` default).
- Node v26.5.0, npm 11.17.0.
- MongoDB + mongosh installed locally. Docker available. 15GB RAM.
- Claude API surface (2026): Opus 5, Sonnet 5, Haiku 4.5 IDs confirmed.

### Graceful degradation contract
All external integrations MUST work against env. When the needed env var is absent:
- **SMTP absent** → log OTP code to server console (dev fallback). Never crash.
- **GOOGLE creds absent** → Google OAuth endpoint returns clear error "Google auth not configured". Login/signup via email still works.
- **CLOUDINARY_URL absent** → store uploads to local `uploads/` dir, Express serves statically, URL is relative. Switch to Cloudinary transparently when env present.
- **ANTHROPIC_AUTH_TOKEN absent** → AI generation returns structured 503. UI shows graceful error.

## 4. Architecture Overview

```
story-builder/
├── package.json          # workspaces + concurrently dev script
├── .env                  # env config (gitignored)
├── node_modules/         # single root
├── server/
│   ├── package.json      # express, mongoose, passport, etc.
│   ├── src/
│   │   ├── index.js      # entry: loads env, connects Mongo, mounts express
│   │   ├── config/
│   │   │   ├── db.js           # mongoose connect
│   │   │   ├── session.js      # express-session + connect-mongo
│   │   │   ├── passport.js     # local + google strategies
│   │   │   ├── mailer.js       # nodemailer (SMTP or console fallback)
│   │   │   ├── storage.js      # cloudinary-or-local abstraction
│   │   │   └── claude.js       # Anthropic client (AUTH_TOKEN)
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── OtpToken.js
│   │   │   ├── Character.js
│   │   │   ├── Story.js
│   │   │   ├── Chapter.js
│   │   │   └── BranchNode.js # branching story graph node
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── character.routes.js
│   │   │   ├── story.routes.js
│   │   │   ├── ai.routes.js      # generation + streaming SSE
│   │   │   ├── upload.routes.js
│   │   │   └── export.routes.js
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── aiService.js       # orchestration
│   │   │   ├── promptTemplates.js # separate file for prompt engineering
│   │   │   ├── characterService.js
│   │   │   ├── storyService.js
│   │   │   ├── exportService.js    # PDF via pdf-lib, EPUB via epub-gen
│   │   │   └── otpService.js
│   │   ├── middleware/
│   │   │   ├── authGuard.js        # session check
│   │   │   └── rateLimit.js       # OTP + AI generation limits
│   │   └── tests/
│   └── uploads/          # local fallback images (gitignored)
├── client/
│   ├── package.json      # react, vite, framer-motion, zustand
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx       # router
│   │   ├── store/        # zustand stores
│   │   ├── services/     # API client wrappers
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── characters/
│   │   │   ├── stories/  # wizard + dashboard
│   │   │   ├── book/     # cover, index, chapter pages, page-flip
│   │   │   └── ui/       # states, buttons, modals
│   │   ├── types/
│   │   └── tests/
│   └── index.html
└── docs/
    ├── ARCHITECTURE.md
    └── (generated outputs)
```

## 5. Data Models

### User
```
_id, name, email (unique), passwordHash (null if Google-only),
isEmailVerified (bool), googleId (null if password-only),
avatarUrl (from Google if applicable), createdAt
```
- One account can have password auth, Google auth, or both (link by email on login if `googleId` null).

### OtpToken
```
_id, email (indexed), otpCodeHash (sha256), purpose (signup-verify | login | password-reset),
expiresAt, attempts, createdAt
```
- TTL index on `expiresAt` (auto-delete).
- OTP: 6-digit, 10-min expiry, max 3 attempts, 5 requests / 15 min / email rate limit, 60s resend cooldown.

### Character
```
_id, userId, name, age, gender, appearance, personality[], likes[], dislikes[],
habits, backstory, role (protagonist|antagonist|side|mentor|supporting),
avatarUrl, relationships: [{ characterId, relationType }],
voiceStyle, catchphrases[], arc, secretTrait, isTemplate (reusable across stories)
```

### Story
```
_id, userId, title, premise, genre, tone, targetAudience, lengthTarget,
pov (1st|2nd|3rd), structureType (single|linear|branching),
generationMode (full-ai|ai-enhanced), characters: [characterId],
coverImageUrl, disclaimerText, status (draft|complete), isPublic,
shareToken (private-link), totalChapters, wordCount, createdAt, updatedAt
```

### Chapter (linear & single stories
single = 1 chapter)
```
_id, storyId, order, title, content, summary (AI consistency context),
isAIGenerated, generatedAt, version (int, for version history),
draftContent (ai-enhanced mode user draft)
```

### BranchNode (branching / non-linear)
```
_id, storyId, title, content, summary, choices: [{ label, targetNodeId }],
isStart (bool), isEnding (bool), parentId (optional), isAIGenerated, version
```

### Version history
- Each regenerated Chapter/BranchNode increments `version`; snapshots kept as an array of `{ version, content, summary, modifiedAt, mode: 'ai'|'user' }` OR separate `ContentVersion` collection. Prefer array-of-snapshots on the doc for simplicity + atomic updates.

## 6. API Contract (REST, JSON except SSE)

Base: `/api`. `Auth: session cookie (httpOnly, secure in prod, sameSite:lax, maxAge 7d sliding)`.

### Auth
- `POST /api/auth/signup` — { name, email, password } → creates user (isEmailVerified:false) + sends OTP → { ok }
- `POST /api/auth/verify-otp` — { email, code, purpose } → marks verified (signup) / issues session (login)
- `POST /api/auth/send-otp` — { email, purpose } → rate-limited resend
- `POST /api/auth/login` — { email, password } → checks isEmailVerified → session
- `POST /api/auth/logout`
- `GET /api/auth/me` — current session user
- `GET /api/auth/google` → passport redirect
- `GET /api/auth/google/callback` → passport callback
- `POST /api/auth/link-google` — link account (requires session)

### Characters
- `GET /api/characters?userId=` or scoped by session
- `POST /api/characters` — create
- `PUT /api/characters/:id` — update
- `DELETE /api/characters/:id`
- `POST /api/characters/:id/duplicate`
- `POST /api/characters/:id/avatar` — upload (multipart) → storage URL

### Stories
- `GET /api/stories` — user's stories (dashboard)
- `POST /api/stories` — create w/ settings
- `GET /api/stories/:id` — incl. structureType + chapters/nodes
- `PUT /api/stories/:id` — update settings / autosave draft
- `DELETE /api/stories/:id`
- `POST /api/stories/:id/regenerate-chapter` — { chapterId, mode: 'only'|'onward' }
- `POST /api/stories/:id/continue` — extend story w/ new chapters

### AI
- `POST /api/ai/generate-chapter` — { storyId, structureType, chapterIndex } → SSE stream of chapter text
- `POST /api/ai/polish-draft` — ai-enhanced mode: { storyId, chapterIndex } → SSE stream of polished text
- `POST /api/ai/regenerate` — { storyId, target, regenerateOnward } → SSE
- `POST /api/ai/generate-cover` — { storyId, description } → image URL (Claude or placeholder)

### Uploads
- `POST /api/upload` — generic multipart (avatar, cover) → storage URL

### Export & Sharing
- `GET /api/stories/:id/export/pdf` — application/pdf
- `GET /api/stories/:id/export/epub` — application/epub+zip
- `POST /api/stories/:id/publish` — { isPublic } → shareToken
- `GET /s/:shareToken` — public read-only view (no session needed)

### Branching
- `GET /api/stories/:id/nodes`
- `POST /api/stories/:id/nodes` — manual node add
- `PUT /api/nodes/:nodeId`
- `DELETE /api/nodes/:nodeId`
- `POST /api/nodes/:nodeId/choices` — add edge
- `DELETE /api/nodes/:nodeId/choices/:choiceId`

## 7. AI Generation Architecture

### Client
- `anthropic-sdk` JS. Auth via `Authorization: Bearer ANTHROPIC_AUTH_TOKEN` (this env), or `ANTHROPIC_API_KEY` if set. Base URL from `ANTHROPIC_BASE_URL`.

### Prompt templates (in `promptTemplates.js` — isolated for quick iteration)
- `buildSystemPrompt(genre, tone, audience, pov)` — scaffolding, style rules.
- `buildCharacterSheet(characters)` — serialized field-by-field, incl. relationships, arcs, secrets, voice. Characters marked "no reveal secret until ch.X".
- `buildChapterPrompt({story, characters, currentChapter, summaryHistory})` — prior summaries (chaining), this chapter's goal, cliffhanger rules.
- `buildStructurePrompt(structureType)` — single: one-shot complete; linear: chapters 1..N with continuity; branching: node + choices written as self-contained scene w/ branching outcomes.
- `buildPolishPrompt({draft, characters, tone})` — ai-enhanced.
- `buildCoverPrompt(story)` — returns image description for cover.

### Consistency chaining
- Every chain-link gets `summary` of previous chapter (linear) or previous node (branching). Chain of prior summaries capped (last 5) to bound tokens. Character sheet always included.
- On `regenerate only chapter N`: subsequent chapters' summaries stay; AI regenerates N using prior summaries as-is. User warns potential drift to chapter N+1 onward.
- On `regenerate onward from N`: N..end regenerated in order, each chaining to fresh summary.

### Streaming (SSE)
- `format: 'text/event-stream'`. Events: `doc-start`, `delta` (text chunks), `summary`, `done`, `error`. Client appends deltas live ("book being written"). Auto-save on `done`.
- Abort + reconnect support: emit `snapshot` id, client can resume.

### Cost & rate control
- Rate-limit AI gen per user: N calls/15min (default 15), large regeneration counts as multiple.
- Token budget per chapter: ~4000-6000 output tokens. Enforce via `max_tokens`.
- Prompt caching (Anthropic `cache_control`) on system prompt + character sheet → same across chapters, cuts cost.
- Estimated: 5-chapter linear story ~$0.50-2.00 (Opus). Use Sonnet by default for cheaper tiers; configurable `AI_MODEL` env.

## 8. Book-Style UI

### Components
- `BookCover` — title, author, cover art, "open book" CTA.
- `DisclaimerPage` — fiction disclaimer + AI notice + custom user text.
- `IndexTable` — TOC, clickable chapters.
- `ChapterPage` — serif (Georgia/serif stack), drop caps, page numbers, margins, justified text.
- `PageFlip` — Framer Motion 3D page-turn (or CSS 3D flip). Desktop + tablet.
- `ReadingMode / EditMode` toggle — distraction-free reader vs annotated editor.
- `BranchingView` — non-linear tree/graph viewer (nodes + choice edges, clickable).
- `CoverArtGenerator` — Claude image desc → generate → save.

### 4 UI states (all components)
Loading (skeleton/spinner) / Empty (prompt) / Error (retry) / Success (interactive).

### Design system
- Same design tokens across all components (colors, type scale, spacing). See `.agents/skills/design-system/`.
- Book theme: cream paper, ink text, serif, drop caps. Genre font presets (fantasy=ornate serif, noir=typewriter). Dark "night reading" mode.

### Routing
- `/` landing/dashboard, `/auth/*`, `/stories/new` wizard, `/stories/:id` reader (structure-aware book view), `/stories/:id/manage` editor, `/characters/*`, `/s/:shareToken` public.

## 9. Auth Details

### Signup flow
1. `POST /signup` — validate email/password, hash password (bcrypt), create User (unverified), create + email OTP.
2. User enters code → `verify-otp` → check hash + expiry + attempts → set `isEmailVerified:true` → issue session.
3. Login checks `isEmailVerified` before issuing session.
4. Rate-limit OTP: 5/15min/email, 60s resend cooldown, max 3 verify attempts.

### Google OAuth
- passport-google-oauth20. Callback: find-or-create by googleId OR email; if exists w/ password auth, link googleId (upgrade to both). Sets session.
- When `GOOGLE_CLIENT_ID` absent → route returns 501 "Google auth not configured in this deployment".
- avatarUrl seeded from Google profile.

### Session
- express-session + connect-mongo store. Cookie httpOnly; secure when NODE_ENV=production; sameSite lax; maxAge 7d sliding (reset on each request).
- `store.ttl` cleanup handled by connect-mongo.

### Security notes
- bcrypt password hashing. OTP codes sha256-hashed in DB (never plaintext). CSRF token for state-changing requests (custom middleware or csurf). Helmet on. Rate limiting (express-rate-limit) globally + tighter on auth/AI. validate input (celebrate/joi). Sanitize HTML in generated story content when displaying (or render as plain text / markdown w/ whitelist). No secrets in client.

## 10. Character Feature Details

- Full CRUD + duplicate. Relationship graph: pick relation to another character (friend, rival, sibling, mentor, parent, spouse, enemy, secret-ally).
- Optional `isTemplate` — reusable in other stories (copy-on-use into story).
- Avatar: uploaded (Cloudinary/local) OR auto initials-fallback when no URL. AI-generated portrait deferred to cover-gen path but same storage route.
- Voice/speech style + catchphrases feed into AI dialogue prompts.

## 11. Story Wizard (create story)

Steps: 1) premise/idea free text → 2) pick structureType (single/linear/branching) + settings (genre, tone, audience, length, pov, generationMode) → 3) select/create characters → 4) generate (chapter-by-chapter for linear/single; node-by-node for branching with choice expansion) → 5) completion.

- Autosave draft (debounced PUT to PATCH story) — premise, settings, character selection.
- Continue/extend: add chapters after last (regenerate chain continuation).

## 12. Export

### PDF (pdf-lib, maintained)
- Reflow content into pages: margins, serif font embedding (Programmer's font table), page numbers, chapter headers, drop caps (first-letter big). NOT pixel-perfect to UI — clean readable book-like PDF. Link want: UI-match optional.

### EPUB (epub-gen 0.1.0, or maintained `epubjs`)
- EPUB = zipped XHTML → chapters as sections, cover, TOC, metadata (title/author). Easier formatting than PDF. epub-gen abandoned; watch for maintainability, pin version.

## 13. Edge Cases & Failure Modes (must handle)

- AI timeout / stream drop → resume from snapshot, retry once, then structured error.
- Token limit exceeded → split chapter, generate remainder in follow-up.
- Empty/blank premise → wizard blocks until text present.
- Character with conflicting secret vs arc → prompt instructs precedence.
- Branching orphan node (choice → non-existent target after node delete) → cascading update on delete (cleanup empty targets) or valid, disallow delete if children.
- Google account w/ same email as local → merge/link, prompt user choice (never silently clobber password).
- OTP brute force → attempts cap + lockout.
- Story contains non-AI user content in ai-enhanced mode → never overwrite draft without versioning; always version bump.
- Regenerate mid-stream user navigates away → orphan SSE; kill server-side task, allow resume.
- Concurrent writes to same story/chapter → optimistic concurrency (version check) or last-write-wins with lost-update warning.
- Invalid share token → 404 page, no data leak.
- Cloudinary down / quota → auto-fallback to local uploads, cache broken URL → regenerate placeholder.
- Cover image fails → initials/themed placeholder.

## 14. Rate Limits & Cost Guards (defaults, configurable .env)

- Global: 100 req/min/IP.
- Auth: 10 req/min, OTP 5/15min/email.
- AI: 15 calls/15min/user; regeneration counts 1 + N chapters; per-call max_tokens 6000; daily budget tracker (optional).

## 15. Testing Strategy

- Backend: **TDD** per agent. Unit: services (OTP, AI prompt build, export). Integration: model validation, route guards (mock session), SSE handler contract.
- Frontend: component tests with Testing Library + Vitest. Test 4 states of each component. a11y (keyboard nav + aria).
- CD: `npm test` (root: runs both) + `npm run build` clean.

## 16. SLICE FOR TICKETS (build order)

Phase 0: Workspaces scaffold, root concurrently, shared config, .env.example, Mongo connect, health route.
Phase 1: Session auth (no OTP) — signup/login/logout/me.
Phase 2: OTP module + email (console fallback) + verification flow.
Phase 3: Google OAuth (env-gated) + account linking.
Phase 4: Character CRUD + duplicate + templates + avatar upload (storage abstraction).
Phase 5: Story CRUD + wizard (settings + structureTypes + autosave).
Phase 6: AI service: prompt templates, chapter gen, SSE streaming, SONNET default, cost guard, rate limit.
Phase 7: Consistency chaining + summaries + versions + regenerate only/onward + continue.
Phase 8: Book UI: cover, disclaimer, index, chapter pages, page-flip, read/edit mode, design tokens, dark mode, routing.
Phase 9: Branching: model, node CRUD, choice edges, tree viewer UI, node AI gen + consistency.
Phase 10: AI-enhanced mode: draft editor, polish streaming, diff/accept-reject, version history.
Phase 11: Export PDF + EPUB.
Phase 12: Sharing publish/private-token + public reader.
Phase 13: Polish: cover generator, genre fonts, TTS (Web Speech), analytics dashboard, multi-language (prompt locale), templates, choose-your-path public reader.
Phase 14: Reviewer pass + build/test harden + README + .env.example + docs.

## 17. Docs conventions
- `docs/ARCHITECTURE.md` written in Phase 0 and kept current.
- All artifacts: CONTEXT.md, SPEC.md, TICKETS.md, REVIEW_REPORT.md (AI Hero outputs).