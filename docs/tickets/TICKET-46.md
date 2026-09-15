# TICKET-46 — [frontend] StoryWizard step components (Premise, Settings, Characters)

> **Phase 5: Story CRUD + Wizard**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-46] [frontend] StoryWizard step components (Premise, Settings, Characters)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/stories/StoryWizard.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/stories/StepIndicator.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/stories/steps/PremiseStep.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/stories/steps/SettingsStep.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/stories/steps/CharactersStep.tsx`
  - **Prerequisites**: TICKET-44, TICKET-36
  - **TDD Criteria**: Component test: PremiseStep disables Generate button when `premise.trim().length < 10`. SettingsStep shows all three structureType options distinctly. CharactersStep lists available characters with toggle, includes template characters. StepIndicator shows current step with labels. Autosave fires debounced (800ms) PUT to PATCH story. ACR-F-08, ACR-F-09.


---
Back to [TICKETS.md](../TICKETS.md)
