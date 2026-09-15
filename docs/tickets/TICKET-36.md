# TICKET-36 — [frontend] UI primitives: AsyncState, Spinner, Skeleton, ErrorAlert, EmptyState, Button, Modal, ConfirmDialog

> **Phase 4: Character CRUD + Storage**
> **Status**: :white_check_mark: done

- [x] **[TICKET-36] [frontend] UI primitives: AsyncState, Spinner, Skeleton, ErrorAlert, EmptyState, Button, Modal, ConfirmDialog**
  - **Target Files**: `/home/harshil26r/Projects/story-builder/client/src/components/ui/AsyncState.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/Spinner.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/Skeleton.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/ErrorAlert.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/EmptyState.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/Button.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/Modal.tsx`, `/home/harshil26r/Projects/story-builder/client/src/components/ui/ConfirmDialog.tsx`
  - **Prerequisites**: TICKET-06
  - **TDD Criteria**: Component tests for each primitive: AsyncState renders skeleton on loading, children on success, ErrorAlert on error, EmptyState on empty. Button accepts `loading` prop and shows spinner. Modal has focus-trap. ConfirmDialog calls `onConfirm`. All have `focus:ring-2 focus:ring-indigo-500/50`. ACR-F-01, ACR-F-03.


---
Back to [TICKETS.md](../TICKETS.md)
