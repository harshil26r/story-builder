# TICKET-41 — [backend] Story + Chapter models

> **Phase 5: Story CRUD + Wizard**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-41] [backend] Story + Chapter models**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/models/Story.js`, `/home/harshil26r/Projects/story-builder/server/src/models/Chapter.js`
  - **Prerequisites**: TICKET-11
  - **TDD Criteria**: Unit test: `Story.create({userId, title, premise, structureType, ...})` succeeds. `title` required 1..120. `premise` required 10..5000. `structureType` enum `single|linear|branching`. `totalChapters` defaults 1 for single. `version` defaults 1. `shareToken` is unique-indexed. `Chapter.create({storyId, order, content, ...})` succeeds. `versions` is array of `ContentSnapshot`. ACR-B-01.


---
Back to [TICKETS.md](../TICKETS.md)
