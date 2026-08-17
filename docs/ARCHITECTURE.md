# Story Builder — Architecture

> Kept current per SPEC.md §17. This file documents the workspace split, ports,
> dev runner, and env-gated services as of the current implementation.

## Workspace split

```
story-builder/
├── package.json          # npm workspaces: ["client", "server"]; concurrently dev
├── .env.example          # full env contract (SPEC §7.1)
├── server/               # ESM JavaScript (Express + Mongoose + Anthropic)
│   ├── package.json
│   ├── uploads/          # local-fallback storage (gitignored)
│   └── src/
│       ├── index.js      # env → db → session → express → listen
│       ├── app.js        # createApp(): helmet, json, session, health route
│       ├── config/       # db.js, session.js, (later) mailer, storage, claude, passport
│       ├── models/       # User, OtpToken, Character, Story, Chapter, BranchNode
│       ├── routes/       # auth, character, story, ai, upload, export, node
│       ├── controllers/
│       ├── services/     # aiService, promptTemplates, characterService, storyService,
│       │                 # exportService, otpService, storage
│       ├── middleware/   # authGuard, rateLimit, csrf, validate
│       ├── validation/   # Joi schemas (mirrors client/src/types/domain.ts)
│       ├── types/        # contracts.d.ts (ambient TS copy for server tests)
│       └── tests/
└── client/               # TypeScript (Vite 6 + React 19 + framer-motion + zustand)
    ├── package.json
    ├── vite.config.ts    # :5173, proxy /api /s /uploads → :5000
    └── src/
        ├── main.tsx / App.tsx
        ├── types/        # domain.ts (authoritative §1), api.ts
        ├── store/        # zustand stores
        ├── services/     # api.ts, sse.ts
        ├── components/   # auth/ characters/ stories/ book/ branching/ ui/
        ├── styles/       # tokens.css (design system)
        └── tests/
```

## Ports & dev runner

| Process | Port | Command |
|---|---|---|
| Express server | `5000` (`PORT` env) | `npm run dev -w server` |
| Vite dev server | `5173` with proxy `/api`,`/s`,`/uploads` → `:5000` | `npm run dev -w client` |
| Root | — | `npm run dev` runs both via `concurrently` |

- **Monorepo rule**: single root `node_modules` (npm workspaces hoisting). No
  nested `node_modules`, no per-workspace lockfile.
- Root scripts: `dev`, `test` (server then client, must exit 0), `build`
  (both workspaces).

## Database

- MongoDB via Mongoose. Default URI `mongodb://127.0.0.1/story-builder`,
  overridable by `MONGO_URI`.
- Sessions stored in Mongo via `connect-mongo` (`sessions` collection), 7-day
  TTL, rolling sliding expiration.
- `connectDB()` calls `process.exit(1)` on failure (fail-fast).

## Env-gated services (graceful degradation)

| Service | Env gate | Present | Absent fallback |
|---|---|---|---|
| Email (OTP) | `SMTP_*` | nodemailer SMTP transport | OTP logged to console |
| Google OAuth | `GOOGLE_CLIENT_ID/SECRET` | passport-google-oauth20 | routes → `501 NOT_CONFIGURED` |
| File storage | `CLOUDINARY_URL` | Cloudinary SDK | local `server/uploads/` served at `/uploads/...` |
| AI generation | `ANTHROPIC_AUTH_TOKEN` | Anthropic client, SSE streaming | AI endpoints emit `503 AI_UNAVAILABLE` |
| Session secret | `SESSION_SECRET` | configured | dev fallback (prod fail-fast) |

## Service boundaries

- **Controllers** are thin: parse/validate → one service call → shape response.
  They never touch Mongoose directly and never build prompts.
- **Services** own domain logic:
  - `storyService`: CRUD, optimistic concurrency (`baseVersion`), publish/share,
    public projection, branching graph invariants, word-count.
  - `characterService`: ownership-scoped CRUD + duplicate + avatar attach.
  - `otpService`: 6-digit code gen, sha256 at rest, 10-min TTL, 3-attempt lockout,
    60s resend cooldown, 5/15min send limit.
  - `aiService`: Claude calls, prompt assembly, consistency chaining, SSE protocol,
    resume, atomic commit.
  - `promptTemplates`: pure functions only (cacheable system prompt).
  - `exportService`: PDF (pdf-lib) + EPUB (epub-gen) buffers.
  - `storage`: `cloudinary-or-local` abstraction, magic-byte checks, failover.
- **Middleware**: `authGuard` (session → req.user), `rateLimit` (global/auth/AI),
  `csrf` (double-submit cookie + header), `validate` (Joi, abortEarly:false,
  stripUnknown:true).

## Request flow (protected route)

`rateLimit(global)` → `csrf` → `validate` → `authGuard` → controller → service
→ response. Errors are centralized to the error contract `{ code, message, fields? }`.