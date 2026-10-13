import { Router } from 'express';
import exploreController from '../controllers/explore.controller.js';
import { validate } from '../middleware/validate.js';
import { exploreQuerySchema } from '../validation/schemas.js';

// Public explore/discovery routes — intentionally NOT behind authGuard or
// csrfProtect: any visitor may browse and search published stories. Only the
// public projection is ever returned (exploreService).
const router = Router();

router.get('/', validate(exploreQuerySchema, 'query'), exploreController.explore);

export default router;
