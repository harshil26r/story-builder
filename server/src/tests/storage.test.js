import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// TICKET-30: Storage abstraction — Cloudinary-or-local.
// Tests run WITHOUT CLOUDINARY_URL so LocalStorage is the active backend.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

describe('storage (TICKET-30)', () => {
  const originalEnv = process.env.CLOUDINARY_URL;

  beforeAll(() => {
    // Ensure CLOUDINARY_URL is absent so LocalStorage is selected.
    delete process.env.CLOUDINARY_URL;
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Restore env.
    if (originalEnv !== undefined) {
      process.env.CLOUDINARY_URL = originalEnv;
    } else {
      delete process.env.CLOUDINARY_URL;
    }
  });

  // Helper: 1x1 PNG (valid image magic bytes: 0x89504e47).
  function pngBuffer() {
    // Minimal valid 1x1 transparent PNG
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
  }

  // Helper: plain text buffer (non-image)
  function textBuffer() {
    return Buffer.from('hello world', 'utf-8');
  }

  // Dynamically import storage so env is settled before module resolution.
  let storage;
  beforeEach(async () => {
    // Re-import to pick up current env state.
    storage = await import('../services/storage.js');
    storage = storage.default || storage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Local mode (no CLOUDINARY_URL)', () => {
    it('upload() writes a file to server/uploads/<folder>/<uuid>.<ext> and returns { url, publicId }', async () => {
      const file = { buffer: pngBuffer(), mimetype: 'image/png', size: pngBuffer().length };
      const result = await storage.upload(file, { folder: 'avatars' });

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('publicId');
      expect(result.url).toMatch(/^\/uploads\/avatars\//);
      expect(result.url).toContain('.png');
      // publicId is the relative path without leading slash
      expect(result.publicId).toMatch(/^avatars\//);

      // Verify the file actually exists on disk.
      const filePath = path.resolve(UPLOADS_DIR, result.publicId);
      expect(fs.existsSync(filePath)).toBe(true);
      const onDisk = fs.readFileSync(filePath);
      expect(onDisk.equals(pngBuffer())).toBe(true);

      // Cleanup
      fs.unlinkSync(filePath);
    });

    it('upload() generates a uuid filename (no collision on repeated calls)', async () => {
      const file = { buffer: pngBuffer(), mimetype: 'image/png', size: pngBuffer().length };
      const r1 = await storage.upload(file, { folder: 'covers' });
      const r2 = await storage.upload(file, { folder: 'covers' });
      expect(r1.publicId).not.toBe(r2.publicId);

      // Cleanup
      const f1 = path.resolve(UPLOADS_DIR, r1.publicId);
      const f2 = path.resolve(UPLOADS_DIR, r2.publicId);
      if (fs.existsSync(f1)) fs.unlinkSync(f1);
      if (fs.existsSync(f2)) fs.unlinkSync(f2);
    });

    it('resolve() returns relative URLs as-is', () => {
      const result = storage.resolve('/uploads/avatars/abc.png');
      expect(result).toBe('/uploads/avatars/abc.png');
    });

    it('resolve() returns absolute URLs as-is', () => {
      const result = storage.resolve('https://res.cloudinary.com/demo/image/upload/v1/test.jpg');
      expect(result).toBe('https://res.cloudinary.com/demo/image/upload/v1/test.jpg');
    });
  });

  describe('Magic-byte validation', () => {
    it('rejects non-image buffer for avatars folder with INVALID_FILE error', async () => {
      const file = { buffer: textBuffer(), mimetype: 'text/plain', size: textBuffer().length };
      await expect(storage.upload(file, { folder: 'avatars' })).rejects.toMatchObject({
        code: 'INVALID_FILE',
      });
    });

    it('accepts valid PNG for avatars folder', async () => {
      const file = { buffer: pngBuffer(), mimetype: 'image/png', size: pngBuffer().length };
      const result = await storage.upload(file, { folder: 'avatars' });
      expect(result.url).toBeTruthy();
      // Cleanup
      const filePath = path.resolve(UPLOADS_DIR, result.publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it('rejects non-image buffer for covers folder with INVALID_FILE error', async () => {
      const file = { buffer: textBuffer(), mimetype: 'text/plain', size: textBuffer().length };
      await expect(storage.upload(file, { folder: 'covers' })).rejects.toMatchObject({
        code: 'INVALID_FILE',
      });
    });
  });

  describe('Cloudinary fallback', () => {
    it('falls back to local when Cloudinary upload throws', async () => {
      // Save original and mock the cloudinary uploader to throw.
      const cloudinaryMod = await import('cloudinary');
      const originalUpload = cloudinaryMod.v2.uploader.upload;
      cloudinaryMod.v2.uploader.upload = vi.fn().mockRejectedValue(new Error('Cloudinary is down'));

      // Set CLOUDINARY_URL to trigger Cloudinary path.
      process.env.CLOUDINARY_URL = 'cloudinary://key:secret@demo';

      // Re-import storage with Cloudinary enabled.
      //   vi.resetModules();
      const freshStorage = await import('../services/storage.js');
      const svc = freshStorage.default || freshStorage;

      const file = { buffer: pngBuffer(), mimetype: 'image/png', size: pngBuffer().length };
      const result = await svc.upload(file, { folder: 'avatars' });

      // Should fall back to local storage.
      expect(result.url).toMatch(/^\/uploads\/avatars\//);

      // Cleanup
      const filePath = path.resolve(UPLOADS_DIR, result.publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      // Restore.
      cloudinaryMod.v2.uploader.upload = originalUpload;
      delete process.env.CLOUDINARY_URL;
    });
  });
});
