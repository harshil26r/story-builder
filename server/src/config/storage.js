// StoryBuilder storage config (SPEC §3.5).
// Thin wrapper that selects the storage engine at boot based on CLOUDINARY_URL.
// The real implementation lives in services/storage.js; this module keeps the
// selection policy in one place and re-exports the singleton + factory.
//
//   CLOUDINARY_URL present → CloudinaryStorage (official cloudinary SDK)
//   absent                → LocalStorage (server/uploads/<folder>/<uuid>.<ext>)
//
// Any Cloudinary failure falls back to LocalStorage for that request (failover
// handled inside CloudinaryStorage); the broken CDN window is cached (10 min).

import { getStorage, LocalStorage, CloudinaryStorage } from '../services/storage.js';

const storage = getStorage();

export default storage;
export { getStorage, LocalStorage, CloudinaryStorage };
