import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/errors.js';

// StoryBuilder storage abstraction (SPEC §3.5) — the ONLY module that touches
// files/Cloudinary. Mode is chosen from env at runtime via getStorage():
//   CLOUDINARY_URL present → CloudinaryStorage (official cloudinary SDK)
//   absent                → LocalStorage  (server/uploads/<folder>/<uuid>.<ext>)
//
// Failover: any Cloudinary failure logs a warning and falls back to LocalStorage
// for that request; the broken CDN window is cached in-memory (10 min) so
// repeated attempts don't hammer the API.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

export const UPLOAD_FOLDERS = ['avatars', 'covers'];

const BROKEN_CDN_CACHE_MS = 10 * 60 * 1000; // 10 minutes
let brokenCdnUntil = 0;

// ── Magic-byte detection (SPEC §3.5: server re-checks magic bytes, not headers)
const MAGIC_BYTES = [
  { mime: 'image/png', prefix: '89504e47' }, // \x89PNG
  { mime: 'image/jpeg', prefix: 'ffd8ff' }, // JPEG SOI
  { mime: 'image/gif', prefix: '47494638' }, // GIF8
  { mime: 'image/webp', prefix: '52494646' }, // RIFF....WEBP
  { mime: 'image/bmp', prefix: '424d' }, // BM
];

const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
};

export function assertImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) {
    throw new AppError('INVALID_FILE', 'File is not a valid image.', 400);
  }
  const head = buffer.subarray(0, 12).toString('hex');
  const ok = MAGIC_BYTES.some(({ prefix }) => head.startsWith(prefix));
  if (!ok) {
    throw new AppError('INVALID_FILE', 'File is not a valid image.', 400);
  }
  return true;
}

function extFromMimetype(mimetype) {
  return (mimetype && EXT_BY_MIME[mimetype]) || '.bin';
}

// ═══════════════════════════════════════════════════════════════════════════
// LocalStorage — writes to server/uploads/<folder>/<uuid>.<ext>
// ═══════════════════════════════════════════════════════════════════════════
export class LocalStorage {
  async upload(file, opts = {}) {
    const { folder } = opts;
    assertImageMagicBytes(file.buffer);

    const ext = extFromMimetype(file.mimetype);
    const publicId = `${folder}/${crypto.randomUUID()}${ext}`;
    const abs = path.join(LOCAL_UPLOADS_ROOT, publicId);
    await fs.promises.mkdir(path.dirname(abs), { recursive: true });
    await fs.promises.writeFile(abs, file.buffer);
    return { url: `/uploads/${publicId}`, publicId };
  }

  async remove(publicId) {
    const abs = path.join(LOCAL_UPLOADS_ROOT, publicId);
    try {
      await fs.promises.unlink(abs);
    } catch {
      // already gone — no-op
    }
  }

  resolve(url) {
    // Relative → served path as-is; absolute → CDN url as-is.
    return url;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CloudinaryStorage — official SDK; fails over to LocalStorage per request.
// ═══════════════════════════════════════════════════════════════════════════
export class CloudinaryStorage {
  async upload(file, opts = {}) {
    const { folder } = opts;
    // During the broken-CDN cache window, skip straight to local.
    if (Date.now() < brokenCdnUntil) {
      // eslint-disable-next-line no-console
      console.warn('[storage] Cloudinary unavailable (cached failure), using local');
      return new LocalStorage().upload(file, { folder });
    }

    try {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
        ...(opts.publicId ? { public_id: opts.publicId } : {}),
      });
      return { url: result.secure_url, publicId: result.public_id };
    } catch (err) {
      // SPEC §3.5: any Cloudinary failure logs a warning + falls back local.
      brokenCdnUntil = Date.now() + BROKEN_CDN_CACHE_MS;
      // eslint-disable-next-line no-console
      console.warn('[storage] Cloudinary upload failed, falling back to local:', err.message);
      return new LocalStorage().upload(file, { folder });
    }
  }

  async remove(publicId) {
    try {
      await cloudinary.api.delete_resources(publicId);
    } catch {
      // no-op
    }
  }

  resolve(url) {
    return url; // absolute CDN url as-is
  }
}

// Factory — reads env at call time so tests can toggle modes.
export function getStorage() {
  return process.env.CLOUDINARY_URL ? new CloudinaryStorage() : new LocalStorage();
}

// Default singleton selected at boot (spec §3.5: "Mode selected at boot from env").
const storage = process.env.CLOUDINARY_URL ? new CloudinaryStorage() : new LocalStorage();
export default storage;