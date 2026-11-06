# Knowledge-base writeback protocol

Use this reference when saving a discovery or correcting an existing note. Choose its destination before editing.

## Choose where to save it

Save a discovery in the primary project KB when it meets these conditions:

- Another contributor or future session working on the project would benefit.
- Evidence supports the claim, such as a working runbook or a decision with its rationale.
- The note is safe to share and contains no secret values or personal data.
- It concerns a project the KB covers, with enough context for someone else to act on it.

Use the private workbench for unfinished hypotheses and personal notes. Research about your own workflow belongs there too. When the destination is uncertain, keep the draft private until it can be reviewed.

Keep secret values in a secrets manager or machine-local environment. A note can name the variable or secret reference needed to retrieve them. Do not copy the value into either KB.

Promotion to the primary KB is a reviewed change. Remove private details, check the evidence, and move the note into the appropriate topic. Stamp `last_updated` with the current system date before publishing.

## Decide what to record

Write down discoveries that source code alone cannot explain:

- External API behavior observed in a specific environment.
- Migration order and the reasons for splitting a phase.
- Interactions between feature flags or environments.
- Causes of flaky tests and commands that rerun them reliably.
- Backfill results and constraints on a cutover.
- Decisions that a future agent could otherwise reopen.
- Work deliberately deferred and the reason for it.

Update an existing note when the discovery changes the same topic. Create a dated note for a separate incident or runbook. If the project has a living plan, update its progress and decisions when they change.

## Date the note

Give new notes this frontmatter, using the system date:

```yaml
---
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
topic: <topic-name>
status: active
---
```

Preserve stable fields in existing frontmatter and update `last_updated`. Keep event dates distinct from the date you reviewed the evidence.

## Write enough to resume the work

Start with the discovery and its consequence. Include evidence that another person can check, then name the affected files or commands. Add follow-ups only when work remains.

For a living plan, update the sections the project already uses. Common sections are `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`. Record dated proof for completed work so a future session can resume from the document.

## Resolve contradictions

When two notes disagree, or a note conflicts with current evidence:

1. Cite the competing claims and their file paths. Check `created` and `last_updated` dates.
2. Use the appropriate authority: code for implementation, runtime evidence for observed behavior, and dated decisions for rationale.
3. Compare evidence quality before preferring a newer note.
4. Correct the stale claim in place. Include the date and a link to the evidence, then update `last_updated`.
5. Use `status: superseded` only when the entire note has been replaced. A correction in the body is enough for a partial change.
6. Update the active plan if the correction affects its scope or a decision.

If the evidence leaves the conflict unresolved, record what is unknown and what would resolve it. Future answers must preserve that uncertainty.

## Refresh or publish

Refresh after changing private workbench notes:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh
```

When only a private index is configured, run `qmd --index <private-index> update` and `qmd --index <private-index> embed`. Use the index name printed by the helper's `env` command.

For shared project notes, inspect the KB's Git state before publishing. The helper stages markdown throughout the KB checkout, so check for unrelated work before running it:

```bash
bash <skill-dir>/scripts/qmd-memory.sh publish "topic: change"
```

`publish` commits markdown in `QMD_KB_PATH` and refreshes its indexes. The configured mode controls whether it pushes:

- In `review` mode, the default, the commit stays local. Show the pending commits and obtain approval for that set before running the helper's `push` command.
- In `auto` mode, it pushes during the configured window. The default is weekdays, 09:00-20:00 local time. It reads the real clock and defers pushes outside that window.

Use the helper for KB publishing so its mode and time window apply. Private workbench notes stay local. If a refresh fails, report that retrieval may be stale; if a push is deferred or fails, state that the note has not been shared.
