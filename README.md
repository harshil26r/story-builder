# 📖 Story Builder

An interactive, branching narrative creator built with **React 19**, **TypeScript**, and **Vite**, configured with an autonomous **Multi-Agent AI Engineering Workflow** powered by the **[AI Hero (aihero.dev)](https://www.aihero.dev/) Main Flow** and **Google Antigravity (`agy`)**.

---

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
| Agent | Role | Scope & Methodology |
| :--- | :--- | :--- |
| **`aihero-lead`** | Lead Orchestrator | Coordinates the 5-stage flow across subagents and reports results. |
| **`griller`** | Requirements Analyst | Challenges assumptions, checks `docs/ARCHITECTURE.md`, writes `CONTEXT.md`. |
| **`specifier`** | Software Architect | Translates context into concrete contracts and UI states in `SPEC.md`. |
| **`ticketer`** | Task Planner | Decomposes specs into atomic `[backend]` and `[frontend]` tasks in `TICKETS.md`. |
| **`builder`** | Core / Backend Engineer | Implements services, state, and domain models using strict TDD. |
| **`frontend-builder`**| Senior Frontend Engineer | Implements UI components with 4 UI states, a11y, and component tests. |
| **`reviewer`** | QA & Review Lead | Runs full test suites, audits diffs, and creates `REVIEW_REPORT.md`. |

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
   > *"Add a Character Inventory system where characters can carry items that unlock specific narrative choices."*
4. Monitor the Subagents:
   Press **`Alt+J`** to observe `griller` -> `specifier` -> `ticketer` -> `builder` & `frontend-builder` -> `reviewer` work in parallel/sequence.

---

## 🛠 Developer Commands

```bash
# Start local development server
npm run dev

# Run full test suite (Vitest + React Testing Library)
npm test

# Build for production
npm run build
```
