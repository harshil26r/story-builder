import { Router } from 'express';
import uploadController from '../controllers/upload.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { csrfProtect } from '../middleware/csrf.js';

// StoryBuilder upload routes (SPEC §3.2 Uploads / Share).
// POST /api/upload — multipart `file` (≤5MB, image/*) + optional `folder`
// ('avatars' | 'covers') → 200 { url }. AUTH + csrf.
//
// Note: the global rate limiter + csrf are applied in app.js mounting; the
// authGuard is required here because it attaches req.user (session scope).

const router = Router();

router.post('/', authGuard, csrfProtect, uploadController.uploadFile);

export default router;