import { Router } from 'express';
import characterController from '../controllers/character.controller.js';
import characterGroupController from '../controllers/characterGroup.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { csrfProtect } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import {
  characterCreateSchema,
  characterUpdateSchema,
  characterCopyTemplateSchema,
  characterGroupNameSchema,
  characterGroupsSchema,
} from '../validation/schemas.js';

// StoryBuilder character routes (SPEC §3.2 Characters) — all AUTH.
// GET/POST /api/characters, GET/PUT/DELETE /api/characters/:id,
// POST /api/characters/:id/copy-template.
// Character groups: GET/POST /api/characters/groups, PUT/DELETE
// /api/characters/groups/:id, PUT /api/characters/:id/groups.
// Mutating verbs are CSRF-protected; every route is validated.
// Cross-user access resolves to 404 NOT_FOUND at the service layer (ACR-B-03).

const router = Router();

router.get('/', authGuard, characterController.list);
router.post(
  '/',
  authGuard,
  csrfProtect,
  validate(characterCreateSchema),
  characterController.create,
);

// Group routes must be registered before `/:id` so "groups" is not captured
// as a character id.
router.get('/groups', authGuard, characterGroupController.list);
router.post(
  '/groups',
  authGuard,
  csrfProtect,
  validate(characterGroupNameSchema),
  characterGroupController.create,
);
router.put(
  '/groups/:id',
  authGuard,
  csrfProtect,
  validate(characterGroupNameSchema),
  characterGroupController.update,
);
router.delete('/groups/:id', authGuard, csrfProtect, characterGroupController.remove);

router.get('/:id', authGuard, characterController.get);
router.put(
  '/:id',
  authGuard,
  csrfProtect,
  validate(characterUpdateSchema),
  characterController.update,
);
router.put(
  '/:id/groups',
  authGuard,
  csrfProtect,
  validate(characterGroupsSchema),
  characterController.setGroups,
);
router.delete('/:id', authGuard, csrfProtect, characterController.remove);

router.post(
  '/:id/copy-template',
  authGuard,
  csrfProtect,
  validate(characterCopyTemplateSchema),
  characterController.copyTemplate,
);

export default router;
