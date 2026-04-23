---
name: qmd-knowledge-base-memory
description: Use this skill when coding agents need persistent project memory from a markdown knowledge base indexed by qmd. Trigger for qmd, memory, knowledge base, prior context, multi-session work, project plans, decision logs, runbooks, avoiding broad grep, writing durable discoveries, refreshing the qmd index, or resolving contradictory knowledge-base notes.
---

# QMD Knowledge Base Memory

Use qmd as the retrieval and writeback layer between coding agents and a persistent markdown knowledge base. The goal is not to dump the whole wiki into context. The goal is to retrieve the few documents, decisions, gotchas, file anchors, and validation gates that change how the task should be done.

## Operating model

- Use qmd before broad knowledge-base grep. Grep is still useful after qmd narrows the search to likely files, exact strings, or code paths.
- Treat direct source code as the source of truth for current implementation. Treat the knowledge base as the source of truth for history, decisions, external-system behavior, caveats, validation runbooks, and why something was done.
- Prefer newer memory documents over older ones when they conflict only after checking evidence quality. Check `created` and `last_updated` frontmatter before relying on a note.
- Verify the knowledge-base directory exists before reading or writing. If it is absent, ask before creating it.
- Do not silently add qmd as a project dependency. Install or run qmd as a global/external tool unless the user explicitly wants repository dependency changes.
- Do not run qmd index mutations automatically. Read/query commands may run directly, but `qmd collection add`, `qmd context add`, `qmd update`, and `qmd embed` require user approval or explicit opt-in via `--apply` or `QMD_APPLY=1`.
- Keep retrieved context compact enough for an agent to act on: summarize findings, cite file paths, and pull only relevant sections with `qmd get` or `qmd multi-get`.

## Configuration

Set these environment variables for each project or shell profile:

```bash
export QMD_INDEX="${QMD_INDEX:-memory}"
export QMD_KB_PATH="/absolute/path/to/knowledge-base"
export QMD_KB_COLLECTION="${QMD_KB_COLLECTION:-knowledge-base}"
export QMD_REPO_PATH="${QMD_REPO_PATH:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
export QMD_PLANS_PATH="${QMD_PLANS_PATH:-}"          # optional
export QMD_PLANS_COLLECTION="${QMD_PLANS_COLLECTION:-project-plans}"
```

The helper script can auto-detect common repo-local knowledge-base directories such as `knowledge-base`, `kb`, or `docs/knowledge-base` when `QMD_KB_PATH` is not set. For native qmd installs tied to a specific nvm Node version, set `QMD_NODE_VERSION` before running the helper.

## Memory preflight

At the start of a coding task that depends on prior project knowledge:

1. Read local project guidance files when present, such as `AGENTS.md`, `CLAUDE.md`, `README.md`, or task-process docs.
2. Confirm the current date before writing memory files.
3. Confirm `QMD_KB_PATH` exists or let the helper auto-detect a repo-local knowledge base. If none exists, ask before creating one.
4. Check qmd availability with `qmd --help` or `qmd status`.
5. Check the index status:

```bash
bash <skill-dir>/scripts/qmd-memory.sh status
```

6. If qmd is missing, tell the user retrieval is degraded and use a narrow fallback search over markdown files only. Recommend installing qmd globally or externally:

```bash
npm install -g @tobilu/qmd
# or
bun install -g @tobilu/qmd
```

## First-time setup or index repair

Run setup when qmd is installed but the relevant collections are missing or stale. By default this is a dry run that prints the qmd mutation commands for the user to approve:

```bash
bash <skill-dir>/scripts/qmd-memory.sh setup
```

After approval, execute the setup with:

```bash
bash <skill-dir>/scripts/qmd-memory.sh setup --apply
```

The setup helper adds the knowledge base as a markdown collection, optionally adds a plans collection when `QMD_PLANS_PATH` or a common plans directory is present, adds generic path context, runs `qmd update`, and then runs `qmd embed`.

Use refresh after memory files change. Default behavior is also dry-run:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh
```

After approval, execute the refresh with:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh --apply
```

## Retrieval ladder

Use this sequence instead of starting with repo-wide grep.

### 1. Task-shape query

Search for the work as a human would describe it:

```bash
qmd --index "$QMD_INDEX" query --json -n 10 --min-score 0.25 \
  "<domain or surface> <operation> <phase or ticket> <what changed or failed>"
```

Include facets such as product area, component, route, user state, operation, feature flag, ticket, phase, external system, runtime, or validation command.

### 2. Exact-anchor query

Search for exact terms, filenames, routes, feature flags, IDs, error messages, and unusual vendor words:

```bash
qmd --index "$QMD_INDEX" search --json -n 10 \
  '"FEATURE_FLAG_NAME" "route-or-method-name" "exact error text"'
```

### 3. Decision/history query

Ask for rationale, not only implementation:

```bash
qmd --index "$QMD_INDEX" query --json -n 8 --min-score 0.25 \
  "why was <decision> chosen and what validation proved it"
```

### 4. Retrieve, then narrow

Use `qmd get` or `qmd multi-get` on top results before reading code. Pull small line ranges when the result is large:

```bash
qmd --index "$QMD_INDEX" get "topic/some-note.md:80" -l 120
qmd --index "$QMD_INDEX" multi-get "#abc123, topic/*.md" --json --max-bytes 20480
```

### 5. Code search only after memory routing

Once qmd identifies relevant anchors, use code tools against those anchors. Good code anchors include files, routes, scripts, feature flags, test names, API methods, reducers/actions, migrations, or runbooks surfaced by qmd.

## Context pack for coding agents

Before editing code, produce a compact context pack in the conversation or task scratchpad:

```markdown
## Memory context
- Task: <one-sentence task goal>
- Retrieved docs:
  - <path> (`last_updated: YYYY-MM-DD`) — <why it matters>
  - <path> (`last_updated: YYYY-MM-DD`) — <why it matters>
- Current state: <what is already implemented/proven>
- Open work: <remaining tasks relevant to this slice>
- Decisions to preserve: <decision + rationale>
- Gotchas: <environment/vendor/test caveats>
- Implementation anchors: <repo files/routes/scripts/tests>
- Validation gates: <commands or proofs to run>
- Unknowns: <questions still requiring code inspection or user input>
```

Keep this short. Do not paste entire plans unless the user asks for the full document.

## Writeback protocol

Write to the knowledge base when a discovery would help the next session and is not obvious from code alone. Examples: external API behavior, migration or refactor ordering, environment quirks, flaky test root causes, feature-flag interactions, deployment/cutover decisions, validation runbooks, or intentionally deferred gaps.

Before writing:

1. Confirm the knowledge-base directory exists.
2. Confirm the current date.
3. Decide whether to update an existing topic note or create a new dated note.
4. Include or update frontmatter:

```yaml
---
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
topic: <topic-name>
status: active
---
```

For long-running plans, update the living sections that make the plan restartable: `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`.

## Handling contradictions

When memory documents contradict each other or conflict with current code, do not blend the claims or silently choose one.

1. Collect the conflicting file paths, `created` dates, `last_updated` dates, and the specific claims that disagree.
2. Verify against the right source of truth: current code for implementation, direct runtime evidence for behavior, and dated decisions/PRs/issues for historical rationale.
3. Prefer newer memory only when the evidence quality is comparable. Older notes with stronger direct evidence can still be more reliable than newer summaries.
4. If a note is stale or wrong, update it in place with a short correction or supersession notice, update `last_updated`, and link to the replacement note or evidence. Use `status: superseded` only when the whole note should no longer guide future work.
5. If the contradiction affects an active task or plan, record the resolution in the relevant `Surprises & Discoveries` or `Decision Log` section with the date and evidence.
6. If the contradiction cannot be resolved, write an explicit unresolved-conflict note with the competing claims, evidence gathered, impact, and next verification step. Do not present either claim as settled fact.

After writing:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh
```

Ask before running the printed refresh commands. If the user already opted into qmd index mutation for the task, run `refresh --apply`. Then mention which memory files were updated.

## Fallbacks

- If qmd is not installed, use narrow markdown search only, such as `find "$QMD_KB_PATH" -name '*.md' -print0 | xargs -0 grep -n "<exact term>"`, and tell the user the qmd index is unavailable.
- If qmd returns many generic results, add exact anchors: ticket IDs, route paths, feature flags, script names, file paths, error messages, and dates.
- If qmd returns no results, run `qmd ls <collection>` to verify the collection and try a broader semantic query. Then use limited grep over likely topic directories.
- If a qmd result conflicts with current code or another memory note, follow `Handling contradictions` before relying on it.

## Reference files

Read these when the task is more than a simple lookup:

- `references/qmd-query-playbook.md` — query templates and retrieval patterns for large tasks.
- `references/writeback-protocol.md` — how to update the knowledge base without making stale, duplicate, or contradictory memory.

## Examples

User: "Continue the API migration; what remains before we can remove the legacy endpoint?"

Use qmd to retrieve the latest plan and related memory notes, produce a context pack with remaining work, then inspect only the named code/test anchors.

User: "Why did the browser test need headful mode?"

Search for the exact suite name plus `headful`, runtime, and failure message. Retrieve the relevant note, summarize the root cause and validation command, and avoid broad grep unless code anchors are needed.

User: "We found a new vendor payload gotcha."

After validating in code, stage, or production, update the relevant topic note or create a dated note with frontmatter, add the decision/gotcha to the active plan when appropriate, then refresh qmd.
