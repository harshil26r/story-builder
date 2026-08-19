# Story Builder — Technical Specification (SPEC.md)

Status: **AUTHORITATIVE CONTRACT** — this file is the single source of truth for implementors (`builder`, `frontend-builder`), the task planner (`ticketer`), and the reviewer. Any code that drifts from a contract stated here is a defect.

Read with: `CONTEXT.md` (product intent + confirmed decisions). Skills that bind portions of this spec: `.agents/skills/design-system/SKILL.md` (visual tokens — binding for all UI), `.agents/skills/implement-frontend/SKILL.md` (component TDD + 4 UI states), `.agents/skills/ui-ux-review/SKILL.md` (aesthetic audit dimensions).

---

## 0. Repo Layout & Language Policy

```
story-builder/
├── package.json              # {"workspaces": ["client", "server"]}, concurrently `dev`
├── .env.example              # full env contract (section 7.1); .env gitignored
├── node_modules/             # SINGLE root hoisted node_modules — never nested
├── shared/                   # (optional, no workspace) only if tsconfig project refs needed
├── server/                   # ESM JavaScript (per CONTEXT decision)
│   ├── package.json
│   ├── uploads/              # local-fallback storage (gitignored)
│   └── src/
│       ├── index.js          # env → db → session → passport → express → listen
│       ├── config/{db,session,passport,mailer,storage,claude}.js
│       ├── models/{User,OtpToken,Character,Story,Chapter,BranchNode}.js
│       ├── routes/{auth,character,story,ai,upload,export}.routes.js
│       ├── controllers/*.js
│       ├── services/{aiService,promptTemplates,characterService,storyService,exportService,otpService,storage}.js
│       ├── middleware/{authGuard,rateLimit,csrf,validate}.js
│       ├── validation/schemas.js        # Joi, mirrors §1 types (source of truth)
│       ├── types/contracts.d.ts         # ambient TS copy of §1 types for server tests
│       └── tests/
└── client/                    # TypeScript (Vite 6 + React 19 + framer-motion + zustand)
    ├── package.json
    ├── index.html
    └── src/
        ├── main.tsx / App.tsx
        ├── types/            # AUTHORITATIVE TS contracts (§1) live here
        │   ├── domain.ts
        │   └── api.ts
        ├── store/            # zustand stores  (§4.4)
        ├── services/         # api.ts, sse.ts  (§4.3)
        ├── components/       # auth/ characters/ stories/ book/ branching/ ui/ (§4.2)
        ├── styles/tokens.css # design tokens (§4.6)
        └── tests/
```

- **Language policy**: `client` is TypeScript. `server` is ESM JavaScript (user-approved in CONTEXT §2). The TS interfaces in §1 are the **authoritative type contract** for both sides; the server mirrors them in Joi schemas (`server/src/validation/schemas.js`) and an ambient `server/src/types/contracts.d.ts` so server tests can type-check.
- **Monorepo rule**: ONE root `node_modules`. `npm install` at root only. No per-workspace lockfile, no nested `node_modules`.
- **Root scripts** (contract for reviewer & CI):
  - `npm run dev` — `concurrently "npm:dev -w server" "npm:dev -w client"`
  - `npm test` — runs server tests then client tests; must exit 0.
  - `npm run build` — builds both workspaces cleanly.
- **Ports**: server `:5000` (env `PORT`), Vite `:5173` with proxy `/api`, `/s`, `/uploads` → `:5000`.

---

## 1. TypeScript Domain Contracts (Source of Truth)

**File:** `client/src/types/domain.ts`. Server mirrors in `server/src/validation/schemas.js` + `server/src/types/contracts.d.ts`. Every server response and every client store payload conforms to these shapes. IDs are 24-char hex Mongo `ObjectId` strings.

```ts
// ── Primitives ─────────────────────────────────────────────────────────────
export type ID = string;
export type ISOString = string;                       // new Date().toISOString()
export type Pov = '1st' | '2nd' | '3rd';
export type StructureType = 'single' | 'linear' | 'branching';
export type GenerationMode = 'full-ai' | 'ai-enhanced';
export type StoryStatus = 'draft' | 'complete';
export type CharacterRole = 'protagonist' | 'antagonist' | 'side' | 'mentor' | 'supporting';
export type OtpPurpose = 'signup-verify' | 'login' | 'password-reset';
export type RelationshipType =
  | 'friend' | 'rival' | 'sibling' | 'mentor' | 'parent'
  | 'spouse' | 'enemy' | 'secret-ally';
export type ContentMode = 'ai' | 'user';

// ── User ───────────────────────────────────────────────────────────────────
export interface User {
  _id: ID;
  name: string;                                      // 1..80 chars
  email: string;                                     // unique, lowercased
  passwordHash: string | null;                       // bcrypt; null iff google-only
  isEmailVerified: boolean;
  googleId: string | null;                           // null iff password-only
  avatarUrl: string | null;
  aiUsage: {                                          // cost/intent guard (§7.3)
    calls: { at: ISOString; storyId?: ID; units: number }[]; // window pruned
    dayTokens: number;
    dayBudgetExceededAt: ISOString | null;
  };
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── OtpToken ───────────────────────────────────────────────────────────────
export interface OtpToken {
  _id: ID;
  email: string;                                     // indexed
  otpCodeHash: string;                               // sha256 hex of 6-digit code
  purpose: OtpPurpose;
  expiresAt: ISOString;                              // TTL index; 10-min lifetime
  attempts: number;                                  // verify attempts so far
  createdAt: ISOString;
}

// ── Character ──────────────────────────────────────────────────────────────
export interface CharacterRelationship {
  characterId: ID;
  relationType: RelationshipType;
}
export interface Character {
  _id: ID;
  userId: ID;                                        // owner-scoped
  name: string;                                      // required, 1..80
  age: number | null;
  gender: string;
  appearance: string;
  personality: string[];                             // free-text tags, max 12
  likes: string[];                                   // max 12
  dislikes: string[];                                // max 12
  habits: string;                                    // optional
  backstory: string;                                 // optional
  role: CharacterRole;
  avatarUrl: string | null;                          // '' → initials fallback
  relationships: CharacterRelationship[];
  voiceStyle: string;                                // feeds AI dialogue (§6)
  catchphrases: string[];                            // max 6
  arc: string;                                       // optional, finalized at creation or later
  secretTrait: string;                               // optional
  secretRevealChapter: number | null;                // null ⇒ "DO NOT REVEAL"
  isTemplate: boolean;                               // reusable across stories
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── Story (discriminated union by structureType) ───────────────────────────
export interface StoryBase {
  _id: ID;
  userId: ID;
  title: string;                                     // required 1..120
  premise: string;                                   // required 10..5000, wizard blocks <10
  genre: string;                                     // required
  tone: string;                                      // required
  targetAudience: string;                            // required
  lengthTarget: string;                              // e.g. 'short'|'medium'|'long' or "5 chapters"
  pov: Pov;
  structureType: StructureType;
  generationMode: GenerationMode;
  characters: ID[];                                  // character ids copied-in by story
  coverImageUrl: string | null;
  disclaimerText: string;                            // default set at create
  status: StoryStatus;
  isPublic: boolean;                                 // default false
  shareToken: string | null;                         // random url-safe, >48 chars entropy
  totalChapters: number;                             // single ⇒ 1
  wordCount: number;
  createdAt: ISOString;
  updatedAt: ISOString;
  version: number;                                   // optimistic-concurrency guard (§3.6)
}

export interface SingleStory extends StoryBase { structureType: 'single'; chapters: Chapter[]; }
export interface LinearStory extends StoryBase { structureType: 'linear';  chapters: Chapter[]; }
export interface BranchingStory extends StoryBase { structureType: 'branching'; nodes: BranchNode[]; }

export type Story = SingleStory | LinearStory | BranchingStory;

// List/dashboard projection — never ships full chapters/nodes.
export interface StorySummary {
  _id: ID; title: string; structureType: StructureType; status: StoryStatus;
  totalChapters: number; wordCount: number; coverImageUrl: string | null;
  updatedAt: ISOString; isPublic: boolean;
}

// ── Version snapshots ──────────────────────────────────────────────────────
// Stored as an ARRAY on the owning document (CONTEXT §5 preferred option).
export interface ContentSnapshot {
  version: number;
  content: string;
  summary: string;
  modifiedAt: ISOString;
  mode: ContentMode;                                 // 'ai' | 'user'
}
// Rule: doc.version === max(versions[].version). Every mutation bumps version and
// pushes a snapshot. Retention cap: CONTENT_VERSION_RETENTION (default 10, LRU-dropped oldest).

// ── Chapter (linear & single; single ⇒ exactly one chapter) ────────────────
export interface Chapter {
  _id: ID;
  storyId: ID;
  order: number;                                     // 1-based
  title: string;
  content: string;                                   // plain-text prose
  summary: string;                                   // AI consistency context (§6)
  isAIGenerated: boolean;
  generatedAt: ISOString | null;
  version: number;
  draftContent: string | null;                       // ai-enhanced: user's original draft
  versions: ContentSnapshot[];
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── BranchNode (branching structure) ───────────────────────────────────────
export interface StoryChoice {
  _id: ID;
  label: string;                                     // 2..80 chars, imperative in-fiction
  targetNodeId: ID | null;                           // null ⇒ dangling (UI blocks publish)
}
export interface BranchNode {
  _id: ID;
  storyId: ID;
  parentId: ID | null;
  title: string;
  content: string;                                   // self-contained scene
  summary: string;
  choices: StoryChoice[];
  isStart: boolean;                                  // exactly ONE per story
  isEnding: boolean;
  isAIGenerated: boolean;
  version: number;
  versions: ContentSnapshot[];
  createdAt: ISOString;
  updatedAt: ISOString;
}
// Graph invariants (enforced by storyService, §3.4):
//   • exactly one isStart node per story; start node must not be an ending.
//   • every non-start node has exactly one parentId; acyclic.
//   • choice.targetNodeId must reference an existing node in the same story,
//     or be null; deleting a node cascades: incoming edges' targetNodeId → null
//     AND surfaces a warning (orphan edge) — never a hard delete of children
//     unless deleteChildren=true is passed.
//   • isEnding nodes MUST have 0 choices; non-ending scenes must have ≥1 choice
//     (except draft in-progress nodes).
```

**Validation rules (Joi, mirrored from above)** — required vs. optional, and value ranges, are exactly the constraints comments above. Additional structural rules:

| Field set | Rule |
|---|---|
| `email` | regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; lowercased; max 254 |
| `password` | 8..128 chars; at least one letter and one number |
| `name` | 1..80, trimmed |
| `title` | 1..120, trimmed |
| `premise` | 10..5000 chars, trimmed; wizard disables Generate below 10 |
| `personality/likes/dislikes` | array of strings, each ≤100 chars, max 12 items |
| `catchphrases` | array ≤6 items, each ≤80 |
| `choice.label` | 2..80 chars; string.length of `choices` 0..6 |
| `order` | ≥ 1 |
| `lengthTarget` | enum `'short'\|'medium'\|'long'` OR free-text "N chapters" |

---

## 2. API Request / Response Payloads

**File:** `client/src/types/api.ts`. All endpoints are `/api`-prefixed, JSON (except SSE + export + multipart upload). Session cookie (`httpOnly`) is the auth mechanism.

### 2.1 Shared

```ts
export interface Ok { ok: true; }
export interface ErrorBody { code: string; message: string; fields?: { field: string; message: string }[]; }

// HTTP status ⇄ code mapping (server MUST honor):
// 400 VALIDATION_ERROR | 401 UNAUTHORIZED | 403 FORBIDDEN (csrf) | 404 NOT_FOUND
// 409 CONFLICT (version mismatch) | 410 OTP_EXPIRED | 429 RATE_LIMITED
// 501 NOT_CONFIGURED (google/cloudinary absent) | 503 AI_UNAVAILABLE | 500 INTERNAL_ERROR
```

### 2.2 Auth

```ts
export interface SignupRequest { name: string; email: string; password: string; }
export interface SendOtpRequest { email: string; purpose: OtpPurpose; }        // 'signup-verify' | 'password-reset'
export interface VerifyOtpRequest { email: string; code: string; purpose: OtpPurpose; }
export interface LoginRequest { email: string; password: string; }
export interface AuthMeResponse { user: User | null; }                          // 200 with user | 200 {user:null}
// Responses: signup/send-otp/verify-otp/login/logout/link-google → Ok (verify-otp & login also set session cookie)
```

### 2.3 Characters

```ts
export interface CharacterInput {
  name: string; age: number | null; gender: string; appearance: string;
  personality: string[]; likes: string[]; dislikes: string[]; habits?: string;
  backstory?: string; role: CharacterRole; relationships: CharacterRelationship[];
  voiceStyle?: string; catchphrases?: string[]; arc?: string; secretTrait?: string;
  secretRevealChapter?: number | null; isTemplate?: boolean;
}
export type CharacterListResponse = { characters: Character[] };
export type CharacterResponse = { character: Character };
export type AvatarUploadResponse = { avatarUrl: string };                       // storage URL (absolute or /uploads/…)
export type DuplicateResponse = { character: Character };                       // copy named "<Name> (Copy)"
```

### 2.4 Stories

```ts
export interface StoryCreateRequest {
  title: string; premise: string; genre?: string; tone?: string;
  targetAudience?: string; lengthTarget?: string; pov: Pov;
  structureType: StructureType; generationMode: GenerationMode;
  characterIds: ID[]; disclaimerText?: string;
}
export interface StoryUpdateRequest {                    // PATCH semantics: all optional, replaces provided keys
  title?: string; premise?: string; genre?: string; tone?: string;
  targetAudience?: string; lengthTarget?: string; pov?: Pov; generationMode?: GenerationMode;
  characterIds?: ID[]; disclaimerText?: string; isPublic?: boolean; status?: StoryStatus;
  baseVersion?: number;                                  // optimistic concurrency (§3.6)
}
export type StoryListResponse = { stories: StorySummary[] };
export type StoryDetailResponse = Story;
export type StoryResponse = { story: Story };
export type RegenerateChapterRequest = { chapterId: ID; mode: 'only' | 'onward'; baseVersion?: number };
export type ContinueRequest = { chaptersCount?: number } & { baseVersion?: number };  // default +3
export type PublishResponse = { isPublic: boolean; shareToken: string };
```

### 2.5 AI (SSE only — see §3.3 for wire protocol; no JSON responses)

### 2.6 Upload / Export / Branching

```ts
// multipart/form-data: file field "file", optional "folder" ('avatars'|'covers')
export type UploadResponse = { url: string };            // absolute CDN URL or relative /uploads/xxx

// Export: GET /api/stories/:id/export/pdf|epub
//   200, Content-Type application/pdf | application/epub+zip, Content-Disposition attachment.

export interface NodeCreateRequest { parentId?: ID | null; title?: string; content?: string; isEnding?: boolean; }
export interface NodeUpdateRequest { title?: string; content?: string; summary?: string; isEnding?: boolean;
                                     baseVersion?: number; }
export interface ChoiceCreateRequest { label: string; targetNodeId?: ID | null; }
export type NodeListResponse = { nodes: BranchNode[] };
export type NodeResponse = { node: BranchNode };
export type ChoiceResponse = { choice: StoryChoice };
```

---

## 3. Server Contracts

### 3.1 Middleware

| Middleware | File | Contract |
|---|---|---|
| `authGuard` | `middleware/authGuard.js` | Reads `req.session.userId`. Missing/invalid → `401 { code:'UNAUTHORIZED' }`. Loads `req.user` from DB, attaches. `optionalAuth` variant sets `req.user=null` instead of failing. |
| `rateLimit` | `middleware/rateLimit.js` | Wraps `express-rate-limit`. Three named instances: `globalLimiter` (100/min/IP), `authLimiter` (10/min/IP on `/api/auth/*`), `aiLimiter` (15 calls/15-min window **per user**, keyed by `req.session.userId`, units = 1 + regenerated chapter count; §7.3). On exceed → `429 { code:'RATE_LIMITED', message, retryAfterSec }` + `Retry-After` header. |
| `csrf` | `middleware/csrf.js` | Double-submit cookie pattern: `GET /api/auth/csrf` sets `csrfToken` cookie (httpOnly:false, sameSite:lax, signed) and returns `{ csrfToken }`. Every `POST/PUT/PATCH/DELETE` must send `x-csrf-token` header matching the cookie. Mismatch/missing → `403 { code:'FORBIDDEN' }`. **Exempt:** `GET /api/auth/google*` (GET, pre-auth), `GET /s/:shareToken` (GET), all other GETs. |
| `validate` | `middleware/validate.js` | Runs `celebrate`/Joi schema from `validation/schemas.js`, `{ abortEarly:false, stripUnknown:true }`. Failure → `400 { code:'VALIDATION_ERROR', fields:[{field,message}...] }`. |

Application order on protected routes: `rateLimit(global)` → `csrf` → `validate` → `authGuard` (auth routes use `authLimiter` instead of global where tighter).

### 3.2 Route signatures

Legend: `AUTH` = authGuard; `O` = optionalAuth; `R` = rateLimit. All bodies are JSON unless noted.

#### Auth (`routes/auth.routes.js`)
| Method | Path | Guard | Body / Query | Success (200/201) | Errors |
|---|---|---|---|---|---|
| GET | `/api/auth/csrf` | — | — | `{ csrfToken }` | — |
| POST | `/api/auth/signup` | R(auth) | `SignupRequest` | `201 { ok:true }` + OTP sent | 400, 409 `EMAIL_EXISTS`, 429 |
| POST | `/api/auth/send-otp` | R(auth) + `sendOtpLimiter` | `SendOtpRequest` | `{ ok:true }` | 400, 404, 429 (5/15min/email + 60s resend) |
| POST | `/api/auth/verify-otp` | R(auth) | `VerifyOtpRequest` | `{ ok:true }` + session | 400, 410 `OTP_EXPIRED`, 429 `OTP_TOO_MANY_ATTEMPTS` (3 attempts), 404 |
| POST | `/api/auth/login` | R(auth) | `LoginRequest` | `{ ok:true }` + session (only if `isEmailVerified`) | 400, 401 `INVALID_CREDENTIALS`, 403 `EMAIL_NOT_VERIFIED` |
| POST | `/api/auth/logout` | csrf | — | `{ ok:true }`, destroys session | — |
| GET | `/api/auth/me` | O | — | `AuthMeResponse` | — |
| GET | `/api/auth/google` | — | — | 302 → Google | 501 if `GOOGLE_CLIENT_ID` absent |
| GET | `/api/auth/google/callback` | — | — | 302 → client `/` (session set) | 501, 500 |
| POST | `/api/auth/link-google` | AUTH + csrf | `{ googleAccessToken }` *(id_token)* | `{ ok:true }` (googleId attached) | 400, 409 `ACCOUNT_ALREADY_LINKED`, 501 |
| POST | `/api/auth/request-password-reset` | R(auth) | `SendOtpRequest` (purpose `password-reset`) | `{ ok:true }` | 400, 429 |
| POST | `/api/auth/reset-password` | R(auth) | `{ email, code, newPassword }` | `{ ok:true }` + session | 400, 410, 429 |

#### Characters (`routes/character.routes.js`) — all AUTH
| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/api/characters` | `CharacterListResponse` (session-scoped; `userId` query ignored/force-owned) | — |
| POST | `/api/characters` | `201 CharacterResponse` | 400, 401 |
| PUT | `/api/characters/:id` | `CharacterResponse` | 400, 401, 404 `NOT_FOUND` (owner mismatch ⇒ 404, never 403 — no ownership leak) |
| DELETE | `/api/characters/:id` | `{ ok:true }` | 401, 404 |
| POST | `/api/characters/:id/duplicate` | `CharacterResponse` copy | 404 |
| POST | `/api/characters/:id/avatar` | `AvatarUploadResponse` — multipart, field `file`, ≤5MB, image/* | 400 `INVALID_FILE`, 413, 401 |

#### Stories (`routes/story.routes.js`) — all AUTH unless noted
| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/api/stories` | `StoryListResponse` | 401 |
| POST | `/api/stories` | `201 StoryResponse` (draft; no generation) | 400, 401 |
| GET | `/api/stories/:id` | `StoryDetailResponse` — includes `chapters` or `nodes` by structureType, **without** `versions[]` (heavy) unless `?withVersions=1` | 401, 404 |
| PUT | `/api/stories/:id` | `StoryResponse` | 400, 401, 404, 409 `CONFLICT` (baseVersion mismatch) |
| DELETE | `/api/stories/:id` | `{ ok:true }` (cascades chapters/nodes) | 401, 404 |
| POST | `/api/stories/:id/regenerate-chapter` | SSE (§3.3) | 400, 401, 404, 409, 503 |
| POST | `/api/stories/:id/continue` | SSE (§3.3) | 400, 401, 404, 503 |
| POST | `/api/stories/:id/publish` | `PublishResponse` — generates `shareToken` on first publish; unpublish clears it | 400, 401, 404 |
| GET | `/api/stories/:id/export/pdf` | `application/pdf` stream | 401, 404, 409 `STORY_INCOMPLETE` (draft/empty) |
| GET | `/api/stories/:id/export/epub` | `application/epub+zip` stream | 401, 404, 409 |

#### Branching (`routes/story.routes.js` + `routes/node.routes.js`) — all AUTH
| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/api/stories/:id/nodes` | `NodeListResponse` | 401, 404 (structureType must be `branching`) |
| POST | `/api/stories/:id/nodes` | `201 NodeResponse` — first node auto-created with `isStart:true` when story has none | 400, 401, 404 |
| PUT | `/api/nodes/:nodeId` | `NodeResponse` | 400, 401, 404, 409 |
| DELETE | `/api/nodes/:nodeId` | `{ ok:true }` — cascades incoming edges → `targetNodeId:null` + warning `orphanedChoices: n` in payload unless `?cascade=0` (then 409 `HAS_CHILDREN`) | 401, 404, 409 |
| POST | `/api/nodes/:nodeId/choices` | `201 ChoiceResponse` | 400, 401, 404 |
| DELETE | `/api/nodes/:nodeId/choices/:choiceId` | `{ ok:true }` | 401, 404 |

#### AI (`routes/ai.routes.js`) — AUTH + `R(ai)`
| Method | Path | Guard | Body | Protocol |
|---|---|---|---|---|
| POST | `/api/ai/generate-chapter` | AUTH, R(ai) | `{ storyId, chapterIndex }` (+ optional `resumeGenerationId`) | SSE |
| POST | `/api/ai/polish-draft` | AUTH, R(ai) | `{ storyId, chapterIndex }` | SSE |
| POST | `/api/ai/regenerate` | AUTH, R(ai) | `{ storyId, target, regenerateOnward, baseVersion? }` | SSE |
| POST | `/api/ai/generate-cover` | AUTH | `{ storyId, description? }` | `200 { imageUrl, altText }` JSON |
| POST | `/api/ai/generate-node` | AUTH, R(ai) | `{ storyId, parentNodeId? }` | SSE |

#### Uploads / Share
| Method | Path | Guard | Success |
|---|---|---|---|
| POST | `/api/upload` | AUTH + csrf | multipart `file` + `folder` → `UploadResponse` (§3.5 storage) |
| GET | `/s/:shareToken` | — | Public `StoryDetailResponse` (chapters/nodes only if `isPublic && shareToken` matches; **no** user PII, versions, or draftContent) |

### 3.3 SSE streaming protocol

**Endpoint list:** `/api/ai/generate-chapter`, `/api/ai/polish-draft`, `/api/ai/regenerate`, `/api/ai/generate-node`, `/api/stories/:id/regenerate-chapter`, `/api/stories/:id/continue`.

Wire format: `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`. Each event: `event: <name>\ndata: <json>\n\n`. No `id:` reconnection required — resume is app-level (below).

| Event | Emitted | `data` payload |
|---|---|---|
| `doc-start` | once, before first delta | `{ jobId, storyId, structureType, chapterIndex, title, nodeId? }` |
| `delta` | many | `{ text: string }` — client appends literally (multi-byte safe: text is UTF-8; a UTF-16 surrogate pair may split across deltas — client must append-then-render, never decode per-delta) |
| `summary` | once at chapter/node completion | `{ summary: string }` — chained forward to next chapter/node |
| `done` | once, after DB save | `{ jobId, saved: { _id, storyId, order, title, content, summary, version, totalChapters, wordCount } \| { _id, storyId, title, content, summary, version, choices, isStart, isEnding, totalNodes, wordCount } }` |
| `error` | on failure, then close | `{ code, message }` (uses §2.1 codes; NO HTML) |
| `snapshot` | after every 25 deltas | `{ jobId, chapterIndex, fullTextSoFar: string, tokensUsedSoFar?: number }` |

**Lifecycle contract:**
1. Server creates `jobId`, starts generation with an internal `AbortController` bound to `req.on('close')` (orphan SSE killed server-side).
2. Partial text is buffered in-memory under `jobId` (TTL 10 min) as `<{ chapterIndex, fullTextSoFar }>`.
3. **Resume:** client re-POSTs the same route with `{ resumeGenerationId: jobId }` before any further `delta`. Server replays `doc-start` + `snapshot`(current buffer) then continues the model stream from its stop reason. Max **one** resume; a second resume attempt → `error { code:'RESUME_EXHAUSTED' }`.
4. On `done`, server commits a **single atomic update** (chapter/node create + summary + version bump + `versions[]` push) then flushes `done`.
5. If the AI provider is unavailable (`ANTHROPIC_AUTH_TOKEN` absent / non-2xx), first retry once with backoff (1s), then `error { code:'AI_UNAVAILABLE', message }` + close. HTTP stays 200 until `error` event (per-event error contract keeps fetch-body parsing simple).
6. Rate-limit units for regeneration = `1 + chaptersRegenerated`.

### 3.4 Controllers & Services

**Controller responsibilities** (thin): parse + validate (via `validate` middleware), call one service, shape response, never touch Mongoose directly, never build prompts.

| Service | File | Exported contract |
|---|---|---|
| `aiService` | `services/aiService.js` | `generateChapter({ storyId, chapterIndex, resumeGenerationId? }, io)` — writes SSE via `io`; `regenerateChapter({ storyId, chapterId, mode }, io)`; `continueStory({ storyId, count }, io)`; `polishDraft({ storyId, chapterIndex }, io)`; `generateNode({ storyId, parentNodeId? }, io)`; `generateCover({ storyId, description? }) → Promise<{ imageUrl, altText }>`; `abort(jobId)`. Owns: Claude API calls, prompt assembly via `promptTemplates`, consistency chaining, saving docs, unit accounting. |
| `promptTemplates` | `services/promptTemplates.js` | **Pure functions only** (§6), no I/O: `buildSystemPrompt({genre,tone,audience,pov,structureType}) → string`; `buildCharacterSheet(characters[]) → string`; `buildSummaryBlock(summaries: {order,summary}[]) → string`; `buildChapterPrompt({story, characters, summaryBlock, chapterIndex, total, chapterGoal}) → string`; `buildStructurePrompt(structureType) → string`; `buildPolishPrompt({draft, story, characters}) → string`; `buildCoverPrompt(story) → { description, styleTag }`. |
| `characterService` | `services/characterService.js` | `list(userId)`, `create(userId, input)`, `update(userId, id, input)`, `remove(userId, id)`, `duplicate(userId, id)`, `attachAvatar(userId, id, url)` — each returns the domain object or throws typed errors (`NotFoundError`, `ValidationError`). |
| `storyService` | `services/storyService.js` | `list(userId) → StorySummary[]`; `create(userId, input) → Story`; `get(userId, id, { withVersions })`; `update(userId, id, patch, baseVersion?)` — throws `ConflictError`; `remove(userId, id)`; `addCharactersCopyIn(userId, id, characterIds)` (copies template refs, never mutates source); `regenerateChapter`, `continueStory` (validate structure + status), `publish(userId, id, isPublic)`, `getPublic(shareToken)`, **graph invariants** for branching (§1); `computeWordCount(storyId)`. |
| `exportService` | `services/exportService.js` | `toPdf(story, chaptersOrNodes) → Buffer` (pdf-lib; embedded serif font; margins 2cm; page numbers; chapter headers; drop caps); `toEpub(story, chaptersOrNodes) → Buffer` (epub-gen pure-JS, pinned; cover + TOC + metadata). Throws `StoryIncompleteError` when story empty. |
| `otpService` | `services/otpService.js` | `send(email, purpose, { mailer, now })` — generate 6-digit code, store sha256 hash, schedule expiry 10min, mail via `mailer` (console fallback); `verify(email, code, purpose) → boolean` (3-attempt cap → lockout; expiry check); `assertResendCooldown(email)` — 60s. |
| `storage` | `services/storage.js` | §3.5. |

### 3.5 Storage abstraction (Cloudinary-or-local)

```ts
// server/src/services/storage.js — the ONLY module that touches files/Cloudinary.
interface StorageInterface {
  upload(file: { buffer: Buffer; mimetype: string; size: number },
         opts: { folder: 'avatars' | 'covers'; publicId?: string }): Promise<{ url: string; publicId: string }>;
  remove(publicId: string): Promise<void>;
  resolve(url: string): string;        // relative → served path; absolute → CDN url as-is
}
```
- Mode selected at boot from env: `CLOUDINARY_URL` present → `CloudinaryStorage` (official `cloudinary` SDK). Absent → `LocalStorage` writing to `server/uploads/<folder>/<uuid>.<ext>`, served by Express `static` at `/uploads/...`. Local `url` is the relative path `/uploads/...`.
- **Failover:** any Cloudinary failure (quota, network, non-2xx) logs a warning and falls back to LocalStorage for that request; the broken CDN URL is cached (in-memory, 10-min) so repeated attempts don't hammer the API.
- Avatar uploads: `≤5MB`, mimetype `image/*` only, server re-checks magic bytes (not just header).

### 3.6 Concurrency rule

`Story.version`, `Chapter.version`, `BranchNode.version` participate in optimistic concurrency. Any mutating request that affects a chapter/node content carries `baseVersion`; server compares to current `version`. Mismatch → `409 { code:'CONFLICT', message:'This story was edited elsewhere. Reload to see the latest version.', fields:[{field:'version', message:'expected <expected>, got <current>'}] }`. The client then offers "Reload" / "Force overwrite" (force = sends `baseVersion: -1`, last-write-wins + `lostUpdate:true` flag in response).

---

## 4. Client Contracts

### 4.1 Routing (`client/src/App.tsx`, react-router v7)

| Route | Component | Guards |
|---|---|---|
| `/` | `DashboardPage` | auth |
| `/auth/login` · `/auth/signup` · `/auth/verify` | `LoginForm` / `SignupForm` / `OtpVerification` | guest |
| `/characters` · `/characters/:id` | `CharactersDashboard` / `CharacterEditor` | auth |
| `/stories/new` | `StoryWizard` | auth |
| `/stories/:id` | `BookReader` (structure-aware) | auth |
| `/stories/:id/manage` | `StoryEditor` (settings + regenerate + branching graph if branching) | auth |
| `/s/:shareToken` | `PublicReader` (read-only, choose-your-path if branching) | public |
| `*` | `NotFoundPage` | — |

### 4.2 Component hierarchy & props

All components below follow the **4-UI-state convention** (§4.5). `/` denotes tree depth. `ui/` primitives are shared.

```
App
├─ AppShell                       { children }
│  ├─ TopNav                     { user, onLogout, navItems }
│  └─ ToastHost                  — (global, driven by ui/Toast store)
├─ pages/*                       (thin route shells; hold stores/SSE wiring)
│  ├─ auth/
│  │  ├─ AuthCard                { mode:'login'|'signup'|'verify', children }
│  │  ├─ LoginForm               { onSubmit(email,password):Promise, isLoading, error, onNeedOtp(email) }
│  │  ├─ SignupForm              { onSubmit(name,email,password):Promise, isLoading, error, onOtpSent(email) }
│  │  └─ OtpVerification         { email, purpose, onSubmit(code):Promise, onResend():Promise, countdownSec, busy }
│  ├─ characters/
│  │  ├─ CharactersDashboard     { characters, onSelect, onCreate, onRefresh }
│  │  ├─ CharacterCard           { character, onEdit, onDelete, onDuplicate }   // role-coded per §4.6
│  │  ├─ CharacterForm           { initial?, onSave(draft:CharacterInput), onCancel }
│  │  ├─ CharacterRelationshipsEditor   { characterId, available:Character[], value:CharacterRelationship[],
│  │  │                                onChange(next), lookup(id):Character|undefined }
│  │  └─ AvatarUploader          { currentUrl, onUploaded(url), onError }
│  ├─ stories/
│  │  ├─ StoriesDashboard        { stories, loading, onCreate }
│  │  ├─ StoryWizard             — 5 steps (premise → structure/settings → characters → generate → complete)
│  │  │  ├─ StepIndicator        { step, labels }
│  │  │  ├─ PremiseStep          { value, onChange, valid }        // valid = trimmed.length ≥ 10
│  │  │  ├─ SettingsStep         { value:StoryCreateRequest, onChange, structureOptions }
│  │  │  ├─ CharactersStep        { selectedIds, available, onToggle }  // add-from templates too
│  │  │  ├─ GenerateStep         { stream, onStart, onAbort, onRetry }  // consumes §4.3 SSE
│  │  │  └─ CompleteStep         { storyId, onOpenBook }
│  │  └─ StoryEditor             { storyId, story, onAutosave(patch) }   // debounced §4.4
│  ├─ book/
│  │  ├─ BookReader              { story:Story, mode:'read'|'edit', onToggleMode }
│  │  ├─ BookCover               { title, author, coverUrl, onOpenBook }   // "open book" CTA
│  │  ├─ DisclaimerPage          { text, onContinue }
│  │  ├─ IndexTable              { entries:{id,title,order}[], onNavigate(i) }
│  │  ├─ ChapterPage             { chapter, pageNumber, spinePos }  // drop caps, justified serif
│  │  ├─ PageFlip                { children, direction, onFlipEnd } // framer-motion 3D
│  │  ├─ ReadingToolbar          { mode, onToggleMode, onExport('pdf'|'epub'), onPublish, onDelete }
│  │  └─ CoverArtGenerator       { storyId, description, onGenerated(url) }
│  ├─ branching/
│  │  └─ BranchingView           { nodes, edges, selectedId, onSelect, onAddNode, onDeleteNode,
│  │                               onAddChoice(nodeId,label), onRemoveChoice, onGenerateNode(payload) }
│  └─ ui/                        — shared primitives, 4-state aware
│     ├─ AsyncState              { status, error?, children?, skeleton? }         // declarative 4-state wrapper
│     ├─ Spinner · Skeleton · ErrorAlert{error,onRetry} · EmptyState{icon,title,action?}
│     ├─ Button{loading} · Modal · ConfirmDialog{title,message,onConfirm} · Toast
└─ services/di.ts                 — DI container (api, stores, sse) for testability
```

### 4.3 API client (`client/src/services/`)

```ts
// api.ts
export const http = {
  get<T>(path: string, opts?): Promise<T>;
  post<T>(path: string, body?, opts?): Promise<T>;
  put<T>(path: string, body?, opts?): Promise<T>;
  patch<T>(path: string, body?, opts?): Promise<T>;
  del<T>(path: string, opts?): Promise<T>;
};
// Auth: reads `csrfToken` cookie, attaches `x-csrf-token` on all mutating verbs.
// Error handling: non-2xx → parse ErrorBody → throw AppError(code,message,fields).

export const authApi = {
  csrf(): Promise<{ csrfToken: string }>;
  signup(req: SignupRequest): Promise<Ok>;
  sendOtp(req: SendOtpRequest): Promise<Ok>;
  verifyOtp(req: VerifyOtpRequest): Promise<Ok>;
  login(req: LoginRequest): Promise<Ok>;
  logout(): Promise<Ok>;
  me(): Promise<AuthMeResponse>;
  resetPassword(req): Promise<Ok>;
};
export const charactersApi = {
  list(): Promise<CharacterListResponse>;
  create(input: CharacterInput): Promise<CharacterResponse>;
  update(id: ID, input: Partial<CharacterInput>): Promise<CharacterResponse>;
  remove(id: ID): Promise<Ok>;
  duplicate(id: ID): Promise<DuplicateResponse>;
  uploadAvatar(id: ID, file: File): Promise<AvatarUploadResponse>;   // FormData
};
export const storiesApi = {
  list(): Promise<StoryListResponse>;
  create(req: StoryCreateRequest): Promise<StoryResponse>;
  get(id: ID, opts?: { withVersions?: boolean }): Promise<StoryDetailResponse>;
  update(id: ID, patch: StoryUpdateRequest): Promise<StoryResponse>;
  remove(id: ID): Promise<Ok>;
  regenerateChapter(storyId: ID, req: RegenerateChapterRequest): Promise<void>;  // starts SSE (§below)
  continue(storyId: ID, req: ContinueRequest): Promise<void>;
  publish(id: ID, isPublic: boolean): Promise<PublishResponse>;
  getShare(token: string): Promise<StoryDetailResponse>;
  exportPdf(id: ID): Promise<Blob>;  exportEpub(id: ID): Promise<Blob>;
};
export const nodesApi = {
  list(storyId: ID): Promise<NodeListResponse>;
  create(storyId: ID, req: NodeCreateRequest): Promise<NodeResponse>;
  update(nodeId: ID, req: NodeUpdateRequest): Promise<NodeResponse>;
  remove(nodeId: ID, opts?: { cascade?: boolean }): Promise<Ok>;
  addChoice(nodeId: ID, req: ChoiceCreateRequest): Promise<ChoiceResponse>;
  removeChoice(nodeId: ID, choiceId: ID): Promise<Ok>;
};

// sse.ts — fetch-based SSE reader (NOT EventSource; needs POST + headers)
export interface SSEHandlers {
  onDocStart?(e): void; onDelta?(text: string): void; onSummary?(s: string): void;
  onSnapshot?(s): void; onDone?(d): void; onError?(err: AppError): void; onClose?(): void;
}
export function streamSSE(
  path: string, body: unknown,
  handlers: SSEHandlers,
  signal: AbortSignal,
): Promise<void>;   // resolves when `done` or `error` event received
// Reads fetch res.body (ReadableStream), line-parses `event:`/`data:`, accumulates
// RFC 4009 SSE framing (multiline data supported).
```

### 4.4 Zustand stores (`client/src/store/`)

All stores share status union `'idle'|'loading'|'empty'|'error'|'success'` (§4.5).

```ts
interface AuthState {
  user: User | null; status: AsyncStatus; error: AppError | null;
  bootstrap(): Promise<void>;            // GET /me on app load
  login(email, password): Promise<void>; signup(name,email,password): Promise<void>;
  sendOtp(email, purpose): Promise<void>; verifyOtp(email, code, purpose): Promise<void>;
  logout(): Promise<void>; clearError(): void;
}
interface CharacterState {
  characters: Character[]; status: AsyncStatus; error: AppError | null;
  fetch(): Promise<void>; create(input): Promise<Character>; update(id, patch): Promise<void>;
  remove(id): Promise<void>; duplicate(id): Promise<void>; uploadAvatar(id, file): Promise<string>;
}
interface StoryState {
  stories: StorySummary[]; current: Story | null;
  status: AsyncStatus; error: AppError | null;
  fetchList(): Promise<void>; fetchOne(id): Promise<void>;
  create(req: StoryCreateRequest): Promise<ID>;
  update(id, patch: StoryUpdateRequest, opts?: { silent?: boolean }): Promise<void>;   // autosave path
  remove(id): Promise<void>; publish(id, isPublic): Promise<void>;
  regenerate(id, req): Promise<void>; continue(id, req): Promise<void>;
}
interface GenerationState {             // drives GenerateStep + reading "book being written"
  job: { status: 'idle'|'streaming'|'done'|'error'; storyId: ID | null;
         chapterIndex: number | null; fullText: string; latestSummary: string | null;
         snapshot: { jobId: string; fullTextSoFar: string } | null; error: AppError | null };
  start(route: 'chapter'|'node'|'polish', storyId: ID, payload: unknown): Promise<void>;
  resume(): Promise<void>;              // uses snapshot.jobId
  abort(): void; reset(): void;
  // internal fed by streamSSE handlers (appendDelta is string-concat-safe: never
  // split a surrogate pair — rely on React rendering, do not decode per chunk)
}
interface BranchState {
  nodes: BranchNode[]; edges: { from: ID; to: ID | null; label: string }[];
  status: AsyncStatus; error: AppError | null; selectedId: ID | null;
  fetch(storyId): Promise<void>; select(id | null): void;
  addNode(storyId, parentId?): Promise<ID>; updateNode(node, patch): Promise<void>;
  deleteNode(id): Promise<void>; addChoice(nodeId, label): Promise<void>; removeChoice(nodeId, choiceId): Promise<void>;
  generateNode(storyId, parentId?): Promise<void>;
}
interface ToastState { push(msg: string, kind?: 'info'|'error'|'success'): void; dismiss(id): void; }
```

**Autosave contract:** `StoryEditor` debounces `update(story.id, patch, { silent:true })` by 800ms. `silent` suppresses toasts; `409 CONFLICT` still surfaces a banner with "Open latest" / "Overwrite" (§3.6).

### 4.5 The 4 UI states (binding convention for EVERY component)

| State | Trigger | Rendered output |
|---|---|---|
| **Loading** | async op in flight, no data yet | `Skeleton` blocks matching final layout (paragraph bars for text, card-shaped ghosts for lists). Never a spinner alone for content areas; spinners allowed inline on buttons. Add `aria-busy="true"`. Graceful: no layout shift. |
| **Empty** | op resolved, 0 items | `EmptyState` (per design-system §4.6): relevant `lucide-react` icon with soft radial glow + 1-2 lines of encouraging microcopy + one primary action button. **Never** a raw dashed gray box. |
| **Error** | op rejected | `ErrorAlert` — user-friendly `message`, `retry` button re-invoking the op, technical `code` in `<details>` for support. Keeps prior content visible beneath (non-destructive). |
| **Success** | data ready | The polished interactive UI. The default. |

Each component's test (Vitest + Testing Library) renders all four states for that component: `loading → skeleton visible`, `empty → cta visible`, `error → retry triggers refetch`, `success → interactive`. a11y: semantic tags, `aria-label`s, visible `focus:ring-2 focus:ring-indigo-500/50` focus rings, keyboard nav.

### 4.6 Design system tokens (BINDING — from `.agents/skills/design-system/SKILL.md`)

Dark obsidian "night reading" identity **default**; light "paper/ink" reader mode opt-in. Tokens as CSS custom properties in `client/src/styles/tokens.css`.

**Surfaces (3-layer elevation):**
- `--bg-canvas: #0a0d14` (`bg-slate-950`)
- `--surface-1: 90% slate-900` + `border slate-800/80` (cards, sidebars)
- `--surface-2: 60% slate-800` + `border slate-700/60` (inputs, nested cards)
- Floating bars/toolbars: `backdrop-blur-md` + translucent surface.

**Accents:**
- `--accent-primary`: indigo→violet gradient (`indigo-400` text, active node `border-l-4 border-l-indigo-500 bg-indigo-500/10`)
- `--accent-choice`: sky/cyan (`sky-400`, `sky-500/20` fills) — choices/branching only
- Role accents on `CharacterCard` / story-node cards: protagonist `emerald`, antagonist `rose`, supporting `amber`, neutral `slate` (pill + `text-*` + `border-*-500/30` per skill)

**Typography:**
- Brand/headings: geometric sans, `tracking-tight font-semibold`
- Narrative/manuscript: editorial serif (`font-serif text-base leading-relaxed tracking-wide`), max line length **65–75ch**, justified in BookReader, **drop caps** on `ChapterPage` (first-letter, `float:left`, 3-line span)
- Metadata/badges: mono/compact sans `text-xs uppercase tracking-wider`
- Genre font presets: `fantasy` → ornate serif; `noir` → typewriter mono; `sci-fi` → geometric sans; applied to `BookCover` title + chapter headings.

**Book/paper (reader mode variant):** cream page `#f5f0e6`, ink `#1f2430`, serif body — exposed as `data-reading-mode="paper"` on the reader container; night mode = obsidian. Also `prefers-color-scheme` respected for app chrome.

**Rules:** icons from `lucide-react` only; transitions `transition-all duration-200 ease-out`; focus `focus:ring-2 focus:ring-indigo-500/50 focus:outline-none`; WCAG AA contrast (4.5:1 body) on all surfaces; spacing 4px/8px rhythm.

**Char/empty microcopy tone:** inviting, e.g. characters empty → "No characters yet. Bring your cast to life — create your first character." with a "+ Create character" button.

---

## 5. Auth & Security

1. **Passwords**: bcrypt `hash(password, 12)`. `passwordHash` null for Google-only; a google-linked user who sets a password later is upgraded to dual-auth.
2. **OTP**: 6-digit, **sha256-hashed** at rest, 10-min TTL (Mongo TTL index on `expiresAt`), **max 3 verify attempts** → on 3rd failure delete token + `429 OTP_TOO_MANY_ATTEMPTS`. Resend cooldown 60s; send limit 5/15min/email.
3. **Session**: `express-session` + `connect-mongo`. Cookie: `httpOnly`, `sameSite:'lax'`, `secure` iff `NODE_ENV=production`, `maxAge 7d` **sliding** (rolling:true). `store.ttl` = 7d.
4. **CSRF**: double-submit cookie + `x-csrf-token` header (§3.1) on all state-changing routes.
5. **Helmet**: defaults ON globally.
6. **Input validation**: Joi/celebrate on every body/params/query (§2/§3.2); `stripUnknown`; no SQL/Mongo injection surfaces (Mongoose + ObjectId casts validated).
7. **AI-content XSS**: generated/user content is **plain-text UTF-8 prose** stored as-is. **Never** `dangerouslySetInnerHTML` with raw AI content. Render via React text nodes, or sanitize with an allowlist when the markdown preview is enabled (`sanitize-html`: `p, strong, em, blockquote, h2, h3, br`). Applied on the **client** at render AND on the **server** at write-time for `ai-enhanced` draft import.
8. **Secrets**: zero secrets in client bundle; `.env` gitignored; `SESSION_SECRET` required in prod (fail-fast).
9. **Ownership**: every query scoped by `req.session.userId`. Cross-user resource → **404** (never 403) to avoid existence leaks.
10. **Sharing**: `shareToken` ≥ 48 chars `crypto.randomBytes(32).toString('base64url')`; public projection strips PII/versions/draftContent; invalid token → 404 page, no data leak.

---

## 6. AI Prompt Templates (concrete — `server/src/services/promptTemplates.js`)

Design: **pure functions**, `{{placeholder}}` syntax below maps to function params. System prompt + character sheet are **cache-controlled** (Anthropic `cache_control` on the system block) — stable byte-for-byte across chapters in a story. All prose output is "no markdown, plain text paragraphs".

### 6.1 `buildSystemPrompt({ genre, tone, audience, pov, structureType }) → string`

Sections in fixed order:

```
SYSTEM PROMPT (cached across chapters)

You are the ghostwriter for an original novel. Write publish-quality prose.

== WORLD & STYLE ==
Genre: {{genre}}
Tone: {{tone}}
Target audience: {{audience}}
Point of view: {{pov}} — maintain strictly. In 1st/2nd person, stay inside the
narrating character's knowledge; in 3rd, a consistent limited or omniscient lens.

== PROSE RULES ==
- Show, don't tell. Concrete sensory detail over abstractions.
- Vary sentence length for rhythm. No clichés, no purple prose, no anachronisms.
- Dialogue sounds natural and reveals character or advances tension.
- Paragraphs separated by a single blank line. NO markdown, NO headers, NO chapter
  titles, NO page numbers, NO scene dividers like "***".
- Never break the fourth wall. Never mention "chapter", "AI", or "generated story".

== STRUCTURE MODE ==
{{structureRules}}

== CONSISTENCY CONTRACT ==
1. Character behavior, voice, secrets, and relationships MUST follow the
   CHARACTER SHEET verbatim. Do not invent traits that contradict it.
2. A secret marked "REVEAL AT: ch.N" may surface only at or after ch.N; before
   that, foreshadow subtly. A secret marked "DO NOT REVEAL" stays implicit.
3. If premise facts conflict with an arc, the arc's intended resolution wins.
4. Honor every entry in "STORY SO FAR". Never contradict established events,
   locations, objects, or character states.
{{characterSheet}}
```

with `buildStructurePrompt(structureType)` inserted at `{{structureRules}}`:

- **single** → "This is a complete one-shot story. Deliver setup, rising action, climax, and resolution within the requested length, ending with a satisfying close."
- **linear** → "Write this as one chapter in a continuous arc. Each chapter advances the arc and ends on a hook — a decision, revelation, or reversal — unless it is the final chapter, which resolves all open threads."
- **branching** → "Each generation produces ONE self-contained scene from a single point of view. It must be comprehensible on its own (a reader may arrive here via any path) while honoring the STORY SO FAR. End the scene with 2–4 choices, each on its own final line, formatted exactly as: [[CHOICE: label]]. Labels are second-person, concrete, in-fiction reader actions — e.g. '[[CHOICE: Descend into the crypt]]', NOT '[[CHOICE: Choose danger]]'. The same choice may not repeat textually."

### 6.2 `buildCharacterSheet(characters) → string` (serialization format)

```
== CHARACTER SHEET ==
--- {{name}} [ROLE: protagonist] ---
AGE: {{age}}     GENDER: {{gender}}
APPEARANCE: {{appearance}}
PERSONALITY: - {{item}}      (bullet per item, ≤12)
LIKES: - {{item}}
DISLIKES: - {{item}}
HABITS: {{habits}}
BACKSTORY: {{backstory}}
VOICE: {{voiceStyle}}        CATCHPHRASES: - "{{phrase}}"
ARC: {{arc}}
SECRET: {{secretTrait}}      [REVEAL AT: ch.{{secretRevealChapter}}] | [DO NOT REVEAL]
RELATIONSHIPS: - {{Name}} ({{relationType}})
```

Rules: every character in `story.characters` is serialized; relationships reference target names (resolved from the character set); omitted optional field → line emits `N/A` (never empty string). Sheet ends with one hard rule line: "All names, genders, and relationship labels in this sheet are authoritative."

### 6.3 `buildSummaryBlock(summaries: { order, summary }[]) → string`

```
== STORY SO FAR ==
[Ch. {{order}}] {{summary}}
   ...    (last {{MAX_SUMMARIES}} entries only; MAX_SUMMARIES = 5)
== CURRENT EVENT ==
Previous chapter ended: "{{lastLine}}"     (last 120 chars of last chapter content)
```

The block is non-cached (per-chapter) and placed inside the **user** turn, not the system prompt.

### 6.4 `buildChapterPrompt({ story, characters, summaryBlock, chapterIndex, total, chapterGoal }) → string`

```
USER TURN (chapter {{chapterIndex}} of {{total}})

{{summaryBlock}}

== THIS CHAPTER ==
Title: {{chapterTitle or 'Chapter N'}}
Core beat: {{chapterGoal}}            (derived in aiService from premise + prior summaries)
Required elements this chapter: {{requiredBeats}}
{{cliffhangerRule}}                   ("End on a hook." unless chapterIndex === total → "Resolve the story.")
Word budget: ~{{estimatedWords}}

Write the chapter now.
```

`chapterGoal` derivation (aiService): when `chapterIndex === 1` use premise; else use a short goal synthesized from the previous summary + premise. The goal is inside the cached system prompt? **No** — it varies per chapter; it lives in the user turn (so system stays cacheable).

### 6.5 `buildPolishPrompt({ draft, story, characters }) → string`

```
USER TURN — POLISH

Polish the author's draft below while preserving their plot, scene order, voice
intent, and structure. Do NOT add or remove scenes or characters. Improve
rhythm, dialogue, sensory detail, grammar, and continuity. Output clean prose
only (no markdown).

== POLISH TARGET ==
Tone: {{tone}}    Genre: {{genre}}

== DRAFT ==
{{draft}}
```

### 6.6 `buildCoverPrompt(story) → { description, styleTag }`

```
USER TURN — COVER

Describe a cover image for this novel. Return exactly two paragraphs.
Paragraph 1 (250–400 words): primary subject, composition, color palette,
lighting, and mood for a {{genre}} cover. Must contain no text, lettering, or logos.
Paragraph 2: a single-line style tag for the illustrator, e.g.
"high-contrast noir woodcut, ink on cream".

== STORY ==
Title: {{title}}
Premise: {{premise}}
Tone: {{tone}}    Genre: {{genre}}
```

`generateCover` calls the model, then stores `description` on the story and produces the image via storage route (AI image endpoint if configured, else themed placeholder SVG from `description` seed).

### 6.7 Budgets & caching

| Setting | Value |
|---|---|
| `AI_MODEL` | env; default `sonnet-5` (CONTEXT §3: Opus 5 / Sonnet 5 / Haiku 4.5 confirmed IDs; Haiku for summaries optionally) |
| `max_tokens` per chapter/node | env `AI_MAX_TOKENS_PER_CHAPTER`, default **6000**; `max_tokens` for summaries: 300 |
| Prompt caching | `cache_control: { type:'ephemeral' }` on system block (system prompt + character sheet). `buildSystemPrompt` output must be byte-identical for a given story across all chapters/nodes. |
| Estimated cost | 5-chapter linear ≈ $0.50–2.00 (Opus); Sonnet cheaper. Tracked via `User.aiUsage` (§7.3). |

---

## 7. Cross-Cutting Contracts

### 7.1 Environment variables (full list + dev fallbacks)

| Variable | Used by | Default / dev fallback |
|---|---|---|
| `NODE_ENV` | server | `development` |
| `PORT` | server | `5000` |
| `MONGO_URI` | db | `mongodb://127.0.0.1/story-builder` |
| `SESSION_SECRET` | session | fail fast in prod; dev fallback `dev-secret-change-me` |
| `ANTHROPIC_AUTH_TOKEN` | claude | absent → AI endpoints emit `503 AI_UNAVAILABLE` (graceful) |
| `ANTHROPIC_BASE_URL` | claude | read from env (already set in this deployment) |
| `ANTHROPIC_API_KEY` | claude | optional alias; used only if `AUTH_TOKEN` absent |
| `AI_MODEL` | aiService | `sonnet-5` |
| `AI_MAX_TOKENS_PER_CHAPTER` | aiService | `6000` |
| `AI_RATE_LIMIT_CALLS`, `AI_RATE_LIMIT_WINDOW_MIN` | rateLimit | `15`, `15` |
| `AI_DAILY_TOKEN_BUDGET` | aiService guard | `1000000` (optional limiter) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | passport | absent → google routes return `501 NOT_CONFIGURED` |
| `CLOUDINARY_URL` | storage | absent → local `server/uploads/` + `/uploads/` static |
| `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM` | mailer | absent → OTP logged to server console (dev fallback), never crash |
| `CORS_ORIGIN` | server | `http://localhost:5173` (default; same-origin via vite proxy otherwise) |
| `CONTENT_VERSION_RETENTION` | storyService | `10` |
| `UPLOAD_MAX_BYTES` | upload | `5242880` (5MB) |

### 7.2 Rate limits (defaults, configurable)

| Scope | Limit | Key |
|---|---|---|
| Global | 100 req/min | IP |
| Auth | 10 req/min | IP |
| OTP send | 5 / 15 min | email (+ 60s resend cooldown) |
| OTP verify | 3 attempts | token (hard lockout → delete) |
| AI generation | 15 calls / 15 min | user (regeneration units = 1 + chapters) |

### 7.3 Cost guard

Every AI call increments `User.aiUsage.calls[]` (pruned to window) and `dayTokens`. When a call would exceed the window budget → `429 RATE_LIMITED`. When `dayTokens > AI_DAILY_TOKEN_BUDGET` → `429 DAY_BUDGET_EXCEEDED` with a clear message ("Daily AI budget reached — resumes at midnight UTC").

### 7.4 Error contract (server → client)

```ts
{ code: string; message: string; fields?: { field: string; message: string }[] }
```
Codes (authoritative): `VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, EMAIL_EXISTS, INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED, OTP_EXPIRED, OTP_TOO_MANY_ATTEMPTS, ACCOUNT_ALREADY_LINKED, NOT_CONFIGURED, CONFLICT, RATE_LIMITED, DAY_BUDGET_EXCEEDED, AI_UNAVAILABLE, RESUME_EXHAUSTED, STORY_INCOMPLETE, HAS_CHILDREN, INVALID_FILE, INTERNAL_ERROR`. Every thrown server error maps to one of these; unhandled 500 → `{ code:'INTERNAL_ERROR', message:'Something went wrong.' }` (no stack traces leak).

### 7.5 Logging

Pino (or console in dev at an equivalent structured level). Log lines are JSON objects. Events:
- `info`: server start, signup, login, logout, otp sent/verified, story created/published, export generated, generation `done` (storyId + tokens).
- `warn`: AI retry, rate-limit hits, Cloudinary failover to local, orphan-SSE abort.
- `error`: AI provider failure, unhandled rejections, OTP lockout triggers.
No plaintext passwords/OTP ever. Emails logged masked (`j***@domain.com`).

---

## 8. Acceptance Criteria (the reviewer checks these against `SPEC.md`)

### 8.1 Backend — data layer & validation
- ACR-B-01: All 6 Mongoose models exist (`User, OtpToken, Character, Story, Chapter, BranchNode`) with unique indexes (`email`, `shareToken`) and the TTL index on `OtpToken.expiresAt`.
- ACR-B-02: Joi schemas reject every malformed payload from §2 with `400 VALIDATION_ERROR` and a `fields` array; tests cover one invalid case per field class (string length, enum, array cap).
- ACR-B-03: Character CRUD enforces user-ownership scoping; reading another user's character returns `404 NOT_FOUND`; test asserts no `403`/leak.
- ACR-B-04: `Story` writes respect `baseVersion` optimistic concurrency → mismatch returns `409 CONFLICT` with the lost-update handshake; `baseVersion:-1` force-overwrite marks `lostUpdate:true`.

### 8.2 Backend — auth & OTP
- ACR-B-05: Signup → unverified user + OTP (console fallback when no SMTP); verify-otp sets `isEmailVerified` and session; login refuses unverified with `403 EMAIL_NOT_VERIFIED`.
- ACR-B-06: OTP brute-force: 3 failed verifies delete the token and `429`; 5 sends/15min/email enforces; 60s resend cooldown enforces; codes stored sha256 (test asserts no plaintext in DB).
- ACR-B-07: Google OAuth: routes return `501 NOT_CONFIGURED` when creds absent (test with env unset); account linking never clobbers an existing passwordHash.
- ACR-B-08: Session cookie flags correct under `NODE_ENV=production` (httpOnly, secure, sameSite lax, 7d rolling).

### 8.3 Backend — storage & uploads
- ACR-B-09: `POST /api/upload` and avatar route accept `image/*` ≤5MB (magic-byte check), return storage URL; local mode serves the file at `/uploads/...`; Cloudinary mode returns absolute URL; both paths covered by unit tests behind the `storage` interface.
- ACR-B-10: Cloudinary failure falls back to local for that request (mock throwing SDK).

### 8.4 Backend — AI service & SSE
- ACR-B-11: `promptTemplates` are pure: same inputs → byte-identical system prompt (enabling cache); test snapshots `buildSystemPrompt` + `buildCharacterSheet` and asserts structure sections (§6 order).
- ACR-B-12: SSE handler emits `doc-start → delta* → snapshot(≥1 per 25 deltas) → summary → done` and `error`-then-close on producer failure; HTTP stays 200; events are `event:/data:` framed; tests use an `EventSource`-style parser against a mocked stream.
- ACR-B-13: Summary chaining: `buildSummaryBlock` caps at last 5 and joins prior summaries; regenerate **only** keeps chapter N+1 summaries untouched; regenerate **onward** recomputes N..end in order; both verified by integration test with a fake stream.
- ACR-B-14: Resume: drop mid-stream → reconnect with `resumeGenerationId` replays buffer + continues; second resume → `error RESUME_EXHAUSTED`.
- ACR-B-15: Token overflow: when `max_tokens` would truncate, server splits and continues in a follow-up call; final `done` reports merged content.
- ACR-B-16: Cost guard: rate-limit units = `1 + chapters` for regenerate; `429` when exceeded; `AI_UNAVAILABLE` `503`-semantics when `ANTHROPIC_AUTH_TOKEN` absent.

### 8.5 Backend — export & sharing
- ACR-B-17: PDF buffer valid (starts `%PDF`), embeds font, includes chapters + page numbers + TOC for linear; single-story exports 1 chapter. EPUB buffer is a valid zip (`epub` mimetype) containing cover + nav.
- ACR-B-18: Export of empty/draft story → `409 STORY_INCOMPLETE`.
- ACR-B-19: Publish generates shareToken; `GET /s/:token` returns public projection with **no** user PII/versions/draftContent; invalid token → 404 JSON.

### 8.6 Frontend — state convention & design system
- ACR-F-01: Every component implements the 4 UI states; each has a component test asserting Loading skeleton, Empty CTA, Error retry, and Success interaction.
- ACR-F-02: Design tokens from §4.6 are the only colors/type used (CI-able grep: no raw hex outside `tokens.css`); icons only from `lucide-react`; WCAG AA contrast on dark surfaces (audit via ui-ux-review skill).
- ACR-F-03: Focus rings (`focus:ring-2 focus:ring-indigo-500/50`), semantic landmarks, keyboard navigation across forms, modal focus-trap, `aria-live` on toasts.

### 8.7 Frontend — auth UX
- ACR-F-04: Signup → OTP screen with countdown + resend; login shows inline errors; `/auth/me` bootstrap preserves session on refresh.
- ACR-F-05: Google button visible only when server advertises it (`GET /api/auth/me` or `/csrf` returns `googleEnabled`); clicking when disabled surfaces the 501 message gracefully.

### 8.8 Frontend — characters
- ACR-F-06: Dashboard lists role-coded cards; CRUD + duplicate + avatar upload wired to stores; empty state shows create CTA (§4.5).
- ACR-F-07: Relationships editor only lists same-user characters; no self-relationship.

### 8.9 Frontend — story wizard & editor
- ACR-F-08: Generate disabled until `premise.trim().length ≥ 10`; 5-step flow persists draft via debounced autosave (800ms) restoring on refresh.
- ACR-F-09: All three `structureType`s presented distinctly; branching API only visible for branching stories; editor routes to `BookReader` for reading.
- ACR-F-10: Regenerate `only`/`onward` UI reflects drift warning ("Chapters after N may diverge") and passes `baseVersion`.

### 8.10 Frontend — book UI & branching
- ACR-F-11: `BookReader` renders cover → disclaimer → index → chapters with PageFlip animation; `ChapterPage` has drop caps, justified serif, page numbers, 65–75ch measure; Read/Edit toggle.
- ACR-F-12: `BranchingView` renders graph (nodes + choice edges + child count metadata), node expand with page-flip, add/delete node and add/remove choice; orphan edges flagged when a target node is deleted.
- ACR-F-13: `GenerateStep` shows live "book being written": streaming deltas append to the page in real time; abort kills SSE (AbortController) and resume reconnects from snapshot after refresh.
- ACR-F-14: `PublicReader` (`/s/:token`) read-only + choose-your-path for branching; no edit affordances.

### 8.11 Cross-cutting
- ACR-X-01: `npm test` passes at root (server + client) with zero failures and zero console errors.
- ACR-X-02: `npm run build` clean in both workspaces (no TS errors, no dead-import warnings).
- ACR-X-03: Security grep passes: no `dangerouslySetInnerHTML` with raw AI content; no plaintext secrets in client; helmet + csrf active; rate-limit headers present on 429.
- ACR-X-04: Graceful degradation table (§7.1) verified by env-toggled tests for SMTP, Google, Cloudinary, and Anthropic absence — each returns the promised fallback, never an uncaught crash.
- ACR-X-05: `docs/ARCHITECTURE.md` kept current with the workspace split and service boundaries.
```

(End of SPEC.md)