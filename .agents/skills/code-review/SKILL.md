---
name: code-review
description: Comprehensive quality audit, test verification, and regression prevention against SPEC.md.
---

# Code Review Workflow

Perform a final quality audit before marking work as finished.

## Steps:
1. **Check Acceptance Criteria**:
   - Compare git diff (`git diff HEAD~1` or working tree) against `SPEC.md`.
   - Verify all tickets in `TICKETS.md` are completed.
2. **Run Full Test Suite**:
   - Run `npm test` and ensure 100% test pass rate.
   - Run `npm run build` to verify clean TypeScript compilation and bundling.
3. **Security & Performance**:
   - Check for cross-site scripting (XSS), unescaped inputs, or state race conditions.
   - Check for memory leaks or excessive re-renders in narrative graph state.
4. **Generate Report**:
   - Output `REVIEW_REPORT.md` with:
     - **Status**: PASSED / FAILED.
     - **Test Results**: Number of tests passed, coverage highlights.
     - **Feedback / Next Steps**.
