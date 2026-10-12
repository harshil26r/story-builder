---
description: Pick the next open GitHub issue and run the full Story Builder lifecycle on it.
agent: workflow-lead
---

Find the oldest open GitHub issue (`gh issue list --state open --limit 1`) and run the
full Story Builder flow on it exactly as `/work-issue` does:

ack → implement (strict TDD) → test → independent review (different model) → PR.

Stop before merging and ask the human to approve the merge. Then, if the human
confirms, merge with `scripts/workflow.sh merge <n> --yes` and report.
