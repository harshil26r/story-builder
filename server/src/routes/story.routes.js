import { Router } from 'express';
import storyController from '../controllers/story.controller.js';
import aiController from '../controllers/ai.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { csrfProtect } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { aiCostGuard } from '../middleware/rateLimit.js';
import Story from '../models/Story.js';
import Chapter from '../models/Chapter.js';
import {
  storyCreateSchema,
  storyUpdateSchema,
  publishSchema,
  regenerateChapterSchema,
  continueSchema,
  chapterContentUpdateSchema,
} from '../validation/schemas.js';

// StoryBuilder story routes (SPEC §3.2 Stories) — all AUTH except the public
// share read (/s/:shareToken). GET/POST /api/stories, GET/PUT/DELETE
// /api/stories/:id, POST /api/stories/:id/publish, plus the regenerate/continue
// SSE streams (SPEC §3.4). Mutating verbs are CSRF-protected; every route is
// validated. Cross-user access resolves to 404 NOT_FOUND at the service layer
// (ACR-B-03).

// ACR-B-16: AI cost-units for the SSE flows. regenerate → 1 + chapters touched
// (mode 'onward' counts N..end); continue → 1 + chaptersCount. Runs before
// aiCostGuard so the guard reserves the right quota.
async function onwardUnits(req, res, next) {
  try {
    let n = 1;
    if (req.body.mode === 'onward') {
      const story = await Story.findById(req.params.id).lean().exec();
      const target = await Chapter.findById(req.body.chapterId).lean().exec();
      const end = Math.max(story?.totalChapters || 0, target?.order || 0);
      n = Math.max(1, end - (target?.order || 0) + 1);
    }
    req.body.units = 1 + n;
    next();
  } catch (err) {
    next(err);
  }
}

async function continueUnits(req, res, next) {
  try {
    req.body.units = 1 + (Number(req.body.chaptersCount) || 1);
    next();
  } catch (err) {
    next(err);
  }
}

const router = Router();

router.get('/', authGuard, storyController.list);
router.post('/', authGuard, csrfProtect, validate(storyCreateSchema), storyController.create);

router.get('/:id', authGuard, storyController.get);
router.put('/:id', authGuard, csrfProtect, validate(storyUpdateSchema), storyController.update);
router.delete('/:id', authGuard, csrfProtect, storyController.remove);

// Chapter-content persistence (TICKET-58) — StoryEditor autosave. Same
// ACR/ownership semantics as every other route: AUTH + CSRF + validate, with
// ownership + optimistic concurrency resolved in storyService.
router.put(
  '/:id/chapters/:chapterId',
  authGuard,
  csrfProtect,
  validate(chapterContentUpdateSchema),
  storyController.saveChapter,
);

router.post(
  '/:id/publish',
  authGuard,
  csrfProtect,
  validate(publishSchema),
  storyController.publish,
);

// SSE streams (SPEC §3.4). regenerate supports mode 'only' (1 unit) and
// mode 'onward' (1 + chapters N..end). continue appends 1..10 chapters
// (1 + chaptersCount units).
router.post(
  '/:id/regenerate-chapter',
  authGuard,
  csrfProtect,
  validate(regenerateChapterSchema),
  onwardUnits,
  aiCostGuard,
  aiController.regenerateChapter,
);
router.post(
  '/:id/continue',
  authGuard,
  csrfProtect,
  validate(continueSchema),
  continueUnits,
  aiCostGuard,
  aiController.continueStory,
);

export default router;

// Public share read (SPEC §3.2 Share) — intentionally NOT behind authGuard or
// csrfProtect: any visitor may read a published story by token. Invalid or
// unpublished token → 404 (controller).
const shareRouter = Router();
shareRouter.get('/:shareToken', storyController.getPublic);
export { shareRouter };
