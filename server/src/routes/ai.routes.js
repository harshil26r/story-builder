import { Router } from 'express';
import aiController from '../controllers/ai.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { csrfProtect } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { aiCostGuard } from '../middleware/rateLimit.js';
import {
  generateChapterSchema,
  polishDraftSchema,
  generateNodeSchema,
  generateCoverSchema,
} from '../validation/schemas.js';

// StoryBuilder AI routes (SPEC §3.2/§3.3). All AUTH + CSRF + validated.
// The AI cost guard reserves per-user units (1 for generate; regenerate
// weights 1 + chapters via body.units) — SPEC §7.3, ACR-B-16.

const router = Router();

router.post(
  '/generate-chapter',
  authGuard,
  csrfProtect,
  validate(generateChapterSchema),
  aiCostGuard,
  aiController.generateChapter,
);

router.post(
  '/polish-draft',
  authGuard,
  csrfProtect,
  validate(polishDraftSchema),
  aiCostGuard,
  aiController.polishDraft,
);

router.post(
  '/generate-node',
  authGuard,
  csrfProtect,
  validate(generateNodeSchema),
  aiCostGuard,
  aiController.generateNode,
);

router.post(
  '/generate-cover',
  authGuard,
  csrfProtect,
  validate(generateCoverSchema),
  aiCostGuard,
  aiController.generateCover,
);

export default router;
