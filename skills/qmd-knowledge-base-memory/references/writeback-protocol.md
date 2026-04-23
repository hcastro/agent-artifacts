# Knowledge-Base Writeback Protocol

Use this when a coding task produces durable knowledge.

## What Belongs In Memory

Write memory for discoveries that are not obvious from source code:

- External API or vendor behavior observed in development, staging, or production.
- Migration, refactor, or rollout sequencing and why a phase was split.
- Feature-flag, configuration, or environment interactions.
- Test instability root causes and stable rerun commands.
- Data backfill counts, dry-run outcomes, rollout constraints, or rollback steps.
- Decisions that future agents are likely to accidentally revisit.
- Gaps that are intentionally deferred.

Do not write memory for trivial code edits that are already clear in the diff.

## Where To Write

1. Update an existing note when the topic already exists and the new information changes the same story.
2. Create a new dated note when the discovery is a new slice, a new vendor gotcha, or a standalone runbook.
3. Update the living plan when progress, surprises, decisions, outcomes, or acceptance gates change.

## Frontmatter

Every markdown memory file should have frontmatter like:

```yaml
---
created: 2026-04-23
last_updated: 2026-04-23
topic: <topic-name>
status: active
---
```

If the file already has frontmatter, preserve stable fields and update `last_updated`.

Use `status: superseded` only when the whole note should no longer guide future work. Prefer a dated correction or supersession notice in the body when only part of a note is stale.

## Body Structure For A New Note

```markdown
# <Specific discovery or runbook title>

## Summary
<What changed or was discovered, in 3-6 sentences.>

## Evidence
- <Command, route, browser proof, runtime probe, log, metric, PR, or code path.>
- <Observed result.>

## Decision or implication
<What future agents should do differently because of this.>

## Implementation anchors
- `<repo/file/or/script>`
- `<test command>`

## Follow-ups
- [ ] <Concrete remaining task, if any.>
```

## Updating Plans

When a task moves long-running work forward, update these sections when present:

- `Progress`: dated checkbox with proof.
- `Surprises & Discoveries`: new gotchas, root causes, or vendor findings.
- `Decision Log`: decisions with rationale and date.
- `Outcomes & Retrospective`: user-visible or validation outcome after a phase/slice closes.

Keep the plan restartable: a new agent should be able to resume from the document without rereading the entire conversation.

## Resolving Contradictions

Use this when two memory notes disagree, or when memory disagrees with current code, runtime behavior, PRs, issues, or user direction.

1. Identify the exact conflicting claims and cite the file paths plus `created` and `last_updated` dates.
2. Verify against the right authority: current code for implementation, direct runtime evidence for behavior, and dated PRs/issues/decisions for rationale.
3. Prefer newer notes only when evidence quality is comparable. Do not discard an older note that contains direct proof unless newer proof supersedes it.
4. Update the stale or incorrect note in place with a dated correction, a link to the replacement evidence, and an updated `last_updated`.
5. Mark `status: superseded` only when the entire note has been replaced. Keep historical context when it explains why the stale decision was reasonable at the time.
6. Update the active plan when the contradiction changes progress, scope, a decision, a validation gate, or a known risk.
7. If unresolved, create or update a note with an `Unresolved conflict` section that lists competing claims, evidence checked, current impact, owner/next step if known, and the date. Treat the topic as uncertain in future answers.

## Refresh QMD

After memory writes:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh
```

The refresh helper prints the qmd mutation commands by default. Ask before applying them. After approval:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh --apply
```

If qmd cannot refresh, mention that the memory file was written but the index may be stale.
