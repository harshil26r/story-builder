---
name: to-spec
description: Synthesizes CONTEXT.md into an authoritative technical specification in SPEC.md.
---

# Technical Specification Workflow

Convert high-level requirements into a binding technical blueprint.

## Steps

1. **Read Inputs**: Review `CONTEXT.md` and relevant source files.
2. **Define Contracts**:
   - TypeScript interfaces, types, and schema models.
   - Service methods (inputs, outputs, side effects, exceptions).
3. **Specify UI Structure**:
   - Component tree layout.
   - State variables, props interfaces, and event handlers.
   - Definition of the **4 UI States**:
     - _Loading_: Visual state during asynchronous fetch/save.
     - _Empty_: Visual state when no items/stories exist.
     - _Error_: User-friendly message with recovery button.
     - _Success_: Normal interactive view.
4. **Acceptance Criteria**: Formulate verifiable pass/fail rules.
5. Save the output to `SPEC.md`.
