---
description: Run the full Story Builder lifecycle for a numbered GitHub issue (ack → implement → test → review → PR).
agent: workflow-lead
---

Work GitHub issue #$1 using the standard Story Builder flow defined in `WORKFLOW.md`.

Do this in order, reporting the result of every stage:

1. Acknowledge: `scripts/workflow.sh ack $1`
2. Implement: delegate to the `issue-implementer` sub-agent in the issue worktree (strict TDD).
3. Test: `scripts/workflow.sh test --dir <worktree>` — must be green.
4. Independent review: delegate to the `issue-reviewer` sub-agent (different model). Loop back to `issue-implementer` on `CHANGES REQUESTED`.
5. PR: `scripts/workflow.sh pr $1 --dir <worktree> --commit feat` and return the PR URL.

Do not merge — stop and ask the human first. If `$1` is empty, ask which issue number to work.
