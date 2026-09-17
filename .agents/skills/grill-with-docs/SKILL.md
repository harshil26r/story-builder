---
name: grill-with-docs
description: Interrogates requirements against Story Builder docs and code, challenges assumptions, and creates CONTEXT.md.
---

# Grill With Docs Workflow

Use this skill whenever starting a new feature or task to ensure thorough pre-alignment.

## Steps

1. **Analyze Requirements**: Read the user task and identify underspecified details (e.g., maximum branches, autosave behavior, data validation).
2. **Consult Project Knowledge**: Read `docs/ARCHITECTURE.md` and check existing schemas in `src/types/story.ts`.
3. **Draft `CONTEXT.md`**:
   - **Problem Statement**: What problem does this solve for storytellers?
   - **User Story & Flow**: Step-by-step user interaction walkthrough.
   - **Resolved Decisions**: Clear answers to all tricky design questions.
   - **Non-Goals / Scope Boundaries**: What will NOT be done in this iteration.
4. Verify `CONTEXT.md` is complete and self-contained.
