# Story Builder Repository Guidelines

Welcome to the **Story Builder** codebase!

## Architecture & Code Philosophy
- **Multi-Agent Flow**: All feature development follows the AI Hero Main Flow (`grill-with-docs` -> `to-spec` -> `to-tickets` -> `implement` -> `code-review`).
- **Domain Modeling**: The core entity model is defined in `src/types/story.ts`. Keep business logic inside `src/services/` and decoupled from React components.
- **Frontend Standards**:
  - React 19 + TypeScript + Vite.
  - Every component must implement the 4 UI states: Loading, Empty, Error, Success.
  - All interactive elements must have proper accessibility labels and keyboard support.
- **Testing**:
  - Run tests with `npm test`.
  - Always write failing tests first (TDD) for both services and components before writing implementation code.
