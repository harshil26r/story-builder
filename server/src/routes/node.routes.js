import { Router } from 'express';
import nodeController from '../controllers/node.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { csrfProtect } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import {
  nodeCreateSchema,
  nodeUpdateSchema,
  choiceCreateSchema,
  choiceDeleteSchema,
} from '../validation/schemas.js';

// StoryBuilder branching routes (SPEC §3.2 Branching) — all AUTH + CSRF +
// validate. Mounted at `/api` in app.js so both path groups are served:
//   /api/stories/:id/nodes        (story-scoped list/create)
//   /api/nodes/:nodeId            (update/delete)
//   /api/nodes/:nodeId/choices    (add/remove choices)
// Cross-user access resolves to 404 NOT_FOUND at the service layer (ACR-B-03).
// choiceDeleteSchema validates the nodeId/choiceId URL params.

const router = Router();

router.get('/stories/:id/nodes', authGuard, nodeController.list);
router.post(
  '/stories/:id/nodes',
  authGuard,
  csrfProtect,
  validate(nodeCreateSchema),
  nodeController.create,
);

router.put(
  '/nodes/:nodeId',
  authGuard,
  csrfProtect,
  validate(nodeUpdateSchema),
  nodeController.update,
);
router.delete('/nodes/:nodeId', authGuard, csrfProtect, nodeController.remove);

router.post(
  '/nodes/:nodeId/choices',
  authGuard,
  csrfProtect,
  validate(choiceCreateSchema),
  nodeController.addChoice,
);
router.delete(
  '/nodes/:nodeId/choices/:choiceId',
  authGuard,
  csrfProtect,
  validate(choiceDeleteSchema, 'params'),
  nodeController.removeChoice,
);

export default router;
