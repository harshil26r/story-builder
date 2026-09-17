---
name: implement-frontend
description: Executes frontend tickets in TICKETS.md using component TDD and the 4 UI states.
---

# Frontend Implementation Workflow

Build robust, accessible, and responsive Story Builder UI components.

## Steps for Each UI Ticket:

1. **Component Contract**:
   - Define TypeScript props interface, event handlers, and local state.
2. **Component Test**:
   - Write a component test in `src/tests/` checking:
     - Rendered elements and labels.
     - User interaction (e.g., clicking 'Add Scene Node', typing character bio).
     - State transitions (Loading -> Success, Error handling).
3. **Build the 4 UI States**:
   - **Loading**: Render skeleton/spinner during async operations.
   - **Empty**: Show a welcoming prompt with an action when no items exist.
   - **Error**: Show inline alerts with retry triggers.
   - **Success**: The polished interactive UI.
4. **Accessibility (a11y)**:
   - Use semantic tags (`<article>`, `<section>`, `<nav>`, `<button>`).
   - Add proper `aria-label`, `role`, and focus rings.
5. **Design System & Aesthetic Polish**:
   - Align with `design-system`: use obsidian surface layers, crisp typography, and Lucide icons.
   - Add micro-transitions (`transition-all duration-200 ease-out`), soft border treatments, and elevation glow.
   - Style empty states with iconography and encouraging microcopy.
6. **Validation**:
   - Run `npm test` and `npm run build`.
   - Check off the ticket in `TICKETS.md`.
