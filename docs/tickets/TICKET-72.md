# TICKET-72 — [backend] Node routes + controller

> **Phase 9: Branching**
> **Status**: :ballot_box_with_check: pending

- [ ] **[TICKET-72] [backend] Node routes + controller**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/routes/node.routes.js`, `/home/harshil26r/Projects/story-builder/server/src/controllers/node.controller.js`
  - **Prerequisites**: TICKET-71, TICKET-16
  - **TDD Criteria**: Integration test: all 6 endpoints per SPEC 3.2 respond correctly. `GET /api/stories/:id/nodes` returns `NodeListResponse`; non-branching story → `400`. `POST /api/stories/:id/nodes` with `parentId` creates child node. `DELETE /api/nodes/:nodeId` with `cascade=0` and has children → `409 HAS_CHILDREN`. `POST /api/nodes/:nodeId/choices` adds choice. Graph invariant errors return structured messages. ACR-B-12 (partial: branching CRUD).


---
Back to [TICKETS.md](../TICKETS.md)
