# TICKET-30 — [backend] Storage abstraction (Cloudinary-or-local)

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-30] [backend] Storage abstraction (Cloudinary-or-local)**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/server/src/services/storage.js`, `/home/harshil26r/Projects/story-builder/server/src/config/storage.js`
  - **Prerequisites**: TICKET-05
  - **TDD Criteria**: Unit test: when `CLOUDINARY_URL` is absent, `LocalStorage.upload()` writes file to `server/uploads/<folder>/<uuid>.<ext>`, returns `{ url: '/uploads/...', publicId }`. When present, uses Cloudinary SDK. `resolve(url)`: relative → returns as-is; absolute → returns as-is. Magic-byte check rejects non-image for avatars. Cloudinary failure → fallback to local (mock throwing SDK). ACR-B-09, ACR-B-10.


---
Back to [TICKETS.md](../TICKETS.md)
