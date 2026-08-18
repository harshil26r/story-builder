---
name: to-tickets
description: Decomposes SPEC.md into atomic, sequentially executable tickets in TICKETS.md.
---

# Ticket Decomposition Workflow

Turn the technical specification into bite-sized, testable tasks.

## Steps
1. **Analyze `SPEC.md`**: Identify independent pieces of work.
2. **Segment by Layer**:
   - Tag with `[backend]` for types, models, state managers, and services.
   - Tag with `[frontend]` for React components, styles, a11y, and event binding.
3. **Format Each Ticket**:
   ```markdown
   - [ ] **[TICKET-01] [backend] Add BranchingNode Data Model**
     - Target: `src/types/story.ts`
     - Description: Define BranchingNode interface and StoryGraph structure.
     - Verification: Type-check and unit test in `src/tests/storyService.test.ts`.
   ```
4. **Order by Dependency**: Ensure prerequisite models/APIs are built before UI components consume them.
5. Save the output to `TICKETS.md`.
