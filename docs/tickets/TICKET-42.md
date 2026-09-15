# TICKET-42 — [backend] Story service (CRUD, publish, word count)

> **Phase 5: Story CRUD + Wizard**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-42] [backend] Story service (CRUD, publish, word count)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/storyService.js`
  - **Prerequisites**: TICKET-41
  - **TDD Criteria**: Unit test: `list(userId)` returns `StorySummary[]` (no chapters/nodes). `create(userId, input)` returns draft Story. `get(userId, id)` returns Story with chapters/nodes by structureType; without versions by default. `get(userId, id, { withVersions: true })` includes versions. `update(userId, id, patch, baseVersion)` succeeds when baseVersion matches; throws `ConflictError` (409) on mismatch; `baseVersion=-1` force-overwrite sets `lostUpdate: true`. `remove(userId, id)` cascades. `publish(userId, id, true)` generates `shareToken` (>=48 chars base64url). `getPublic(shareToken)` strips PII/versions/draftContent; invalid token → null. `computeWordCount(storyId)` sums content lengths. ACR-B-04, ACR-B-19.


---
Back to [TICKETS.md](../TICKETS.md)
