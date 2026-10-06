import { Router } from 'express';
import exportController from '../controllers/export.controller.js';
import { authGuard } from '../middleware/authGuard.js';

// StoryBuilder export routes (SPEC §3.2 Export, TICKET-79). GET only — no CSRF
// needed. Ownership is enforced in storyService.get (404, never 403 — ACR-B-03).

const router = Router();

router.get('/:id/export/pdf', authGuard, exportController.pdf);
router.get('/:id/export/epub', authGuard, exportController.epub);

export default router;
