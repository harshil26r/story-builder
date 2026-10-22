# 📖 Story Builder

An interactive, branching narrative creator built with **React 19**, **TypeScript**, and **Vite**, configured with an autonomous **Multi-Agent AI Engineering Workflow** powered by the **[AI Hero (aihero.dev)](https://www.aihero.dev/) Main Flow** and **Google Antigravity (`agy`)**.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 20** (npm workspaces monorepo; single root `node_modules`).
- **MongoDB** running locally (default URI `mongodb://127.0.0.1/story-builder`, override with `MONGO_URI`).
  - Native service: `npm run mongo:start` (or `systemctl --user start mongod`)
  - Docker service: `npm run docker:mongo` (or `docker compose up -d mongodb`)
- **`ANTHROPIC_AUTH_TOKEN`** (Claude). Optional but gated integrations degrade gracefully when absent (see below).

### Setup

```bash
# 1. Install dependencies (npm workspaces, single root node_modules)
npm install

# 2. Configure environment — copy the template and adjust
cp .env.example .env
```

### Run

```bash
npm run dev        # Express (:5000) + Vite (:5173) together via concurrently
```

Open http://localhost:5173.

### Test / Build

```bash
npm test           # server then client Vitest suites, must exit 0
npm run build      # build server + client workspaces
npm run typecheck  # TypeScript check (client, tsc -b)
npm run test:coverage   # client coverage report — requires @vitest/coverage-v8
```

> `npm run test:coverage` needs the `@vitest/coverage-v8` provider installed in the client workspace; the coverage config is otherwise inert for plain `vitest run`.

### Required vs optional env vars

| Env var                                     | Required?   | Purpose                                                                 |
| :------------------------------------------ | :---------- | :---------------------------------------------------------------------- |
| `MONGO_URI`                                 | optional    | Mongo connection string (has localhost default)                         |
| `SESSION_SECRET`                            | production  | Session signing secret (dev has a fallback)                             |
| `ANTHROPIC_AUTH_TOKEN`                      | recommended | Claude AI generation; absent → AI endpoints return `503 AI_UNAVAILABLE` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional    | Google OAuth; absent → Google routes return `501 NOT_CONFIGURED`        |
| `CLOUDINARY_URL`                            | optional    | Cloud file storage; absent → uploads stored in `server/uploads/`        |
| `SMTP_HOST/PORT/USER/PASS`                  | optional    | OTP email; absent → OTP codes logged to the server console              |

The complete env contract lives in [`.env.example`](.env.example).

### Documentation

Project context, spec, tickets, and architecture live under [`docs/`](docs/):

- `docs/CONTEXT.md` — product decisions & confirmed facts
- `docs/SPEC.md` — authoritative technical spec
- `docs/TICKETS.md` — build order / ticket index
- `docs/ARCHITECTURE.md` — workspace split, services, deployment model
- `docs/tickets/` — individual ticket briefs

## 🤖 Multi-Agent System Architecture

Story Builder is designed to be developed, extended, and maintained by a team of specialized AI agents coordinated by a **Lead Orchestrator**:

```mermaid
flowchart TD
    Task["User Task / Feature Request"] --> Lead["Lead Orchestrator (aihero-lead)"]

    subgraph AI_Hero_Main_Flow ["AI Hero 5-Stage Engineering Pipeline"]
        Lead -->|1. Interrogate Requirements| Griller["griller (grill-with-docs)"]
        Griller -->|CONTEXT.md| Specifier["specifier (to-spec)"]
        Specifier -->|SPEC.md| Ticketer["ticketer (to-tickets)"]
        Ticketer -->|TICKETS.md [backend]| Builder["builder (implement - TDD)"]
        Ticketer -->|TICKETS.md [frontend]| FEBuilder["frontend-builder (implement-frontend)"]
        Builder --> Reviewer["reviewer (code-review)"]
        FEBuilder --> Reviewer
    end

    Reviewer -->|REVIEW_REPORT.md (Passed)| Lead
    Lead --> Shipped["Production Ready & Verified Feature"]
```

### Agent Roster (`.agents/agents/`)

| Agent                  | Role                     | Scope & Methodology                                                              |
| :--------------------- | :----------------------- | :------------------------------------------------------------------------------- |
| **`aihero-lead`**      | Lead Orchestrator        | Coordinates the 5-stage flow across subagents and reports results.               |
| **`griller`**          | Requirements Analyst     | Challenges assumptions, checks `docs/ARCHITECTURE.md`, writes `CONTEXT.md`.      |
| **`specifier`**        | Software Architect       | Translates context into concrete contracts and UI states in `SPEC.md`.           |
| **`ticketer`**         | Task Planner             | Decomposes specs into atomic `[backend]` and `[frontend]` tasks in `TICKETS.md`. |
| **`builder`**          | Core / Backend Engineer  | Implements services, state, and domain models using strict TDD.                  |
| **`frontend-builder`** | Senior Frontend Engineer | Implements UI components with 4 UI states, a11y, and component tests.            |
| **`reviewer`**         | QA & Review Lead         | Runs full test suites, audits diffs, and creates `REVIEW_REPORT.md`.             |

---

## 🚀 How to Run with `agy`

1. Open a terminal inside this directory:
   ```bash
   cd /home/harshil26r/Projects/story-builder
   agy
   ```
2. Activate the Orchestrator:
   Type `/agents` and select **`aihero-lead`**.
3. Give any feature request:
   > _"Add a Character Inventory system where characters can carry items that unlock specific narrative choices."_
4. Monitor the Subagents:
   Press **`Alt+J`** to observe `griller` -> `specifier` -> `ticketer` -> `builder` & `frontend-builder` -> `reviewer` work in parallel/sequence.

---

## 🛠 Developer Commands

Full command reference is in the [Quick Start](#-quick-start) section above (`npm run dev` / `npm test` / `npm run build` / `npm run typecheck`). Per-workspace commands use npm's `-w` flag, e.g. `npm run dev -w server` or `npm test -w client`.
