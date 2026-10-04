import multer from 'multer';
import storageService from '../services/storage.js';
import { AppError } from '../utils/errors.js';

// StoryBuilder upload controller (SPEC §3.2 Uploads / §3.5).
// Multipart POST /api/upload → { url } via the storage abstraction.
//
// Sizing: multer memory storage reads the whole file into RAM; we enforce the
// 5MB cap from env (UPLOAD_MAX_BYTES) at the multer layer so oversized uploads
// short-circuit to 413 BEFORE any local disk write or Cloudinary call.

export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024;

// Multer is a factory — one shared instance is fine (memory storage, no state).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_MAX_BYTES,
    files: 1,
  },
  // fileFilter rejects non-image mimetypes early (defense-in-depth; the storage
  // layer still re-checks magic bytes per SPEC §3.5).
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new AppError('INVALID_FILE', 'Only image files are allowed.', 400));
  },
});

function handleMulterError(err, res) {
  // Multer sends LIMIT_FILE_SIZE when the file exceeds the limit.
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'File exceeds the 5 MB upload limit.',
    });
  }
  return res.status(400).json({
    code: 'INVALID_FILE',
    message: err && err.message ? err.message : 'Invalid file.',
  });
}

// ── POST /api/upload ────────────────────────────────────────────────────────
export function uploadFile(req, res, next) {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return handleMulterError(err, res);
    }
    try {
      if (!req.file || !req.file.buffer) {
        throw new AppError('INVALID_FILE', 'No file was uploaded.', 400);
      }

      // folder is optional; only avatars/covers are valid targets.
      const folder = req.body && req.body.folder;
      if (folder && !['avatars', 'covers'].includes(folder)) {
        throw new AppError('INVALID_FILE', `Unknown folder: ${folder}`, 400);
      }
      const target = folder || 'avatars';

      const result = await storageService.upload(req.file, { folder: target });
      return res.json({ url: result.url });
    } catch (err) {
      // The storage layer may have already written the local file before
      // failing — not our concern here; the error contract is what matters.
      return next(err);
    }
  });
}

export default { uploadFile, uploadMiddleware: upload };
