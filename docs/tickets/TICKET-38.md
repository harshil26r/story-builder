# TICKET-38 — [frontend] CharacterForm + CharacterRelationshipsEditor

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-38] [frontend] CharacterForm + CharacterRelationshipsEditor**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/characters/CharacterForm.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/characters/CharacterRelationshipsEditor.tsx`
  - **Prerequisites**: TICKET-35, TICKET-36
  - **TDD Criteria**: Component test: CharacterForm renders all fields (name, age, gender, personality tags, role, voice, catchphrases, secret, arc, etc.). Validates required fields (name, role). CharacterRelationshipsEditor only lists same-user characters; no self-relationship option. Relationships display with correct relationType label. Save calls `onSave(draft: CharacterInput)`. ACR-F-07.


---
Back to [TICKETS.md](../TICKETS.md)
