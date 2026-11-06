---
name: qmd-memory
description: Searches persistent markdown knowledge bases with qmd and writes dated discoveries back. Use for prior project context, decisions, runbooks, private notes, multi-session work, conflicting memory, or qmd index setup and repair. Supports any repository with explicitly configured KB paths and indexes.
---

# QMD memory

Use qmd to find the notes that affect the current task. Retrieve relevant sections before searching source code broadly, then verify claims against current evidence. Save discoveries that would help a future session.

## Scope and dependencies

The skill works across repositories. It contains no organization-specific paths or index names. Read the current environment and the KB's `.kb-config` to determine the scope. A user-level installation does not make one project's knowledge base relevant to every repository.

Run `scripts/qmd-memory.sh` from this skill's installed directory. It needs Bash, Git, Unix command-line tools, and qmd 2.8 or later. Node.js parses search results as JSON. Keep qmd global or external to the project; ask before installing a missing dependency.

Read [README.md](README.md) when installing the skill or changing its configuration. It covers environment variables, per-project scope, and migration from the earlier personal version. `setup` and `refresh` apply changes immediately.

## Start with memory

- [ ] Read the repository's `AGENTS.md` or other project guidance.
- [ ] Run the helper's `env` and `indexes` commands to see the configured scope.
- [ ] Check that the relevant note folders exist and that the selected indexes contain documents.
- [ ] Choose the indexes relevant to the user's request.
- [ ] Retrieve a small set of results and open only the sections needed for the task.

`QMD_KB_PATH` selects the primary KB. Its `.kb-config` supplies the `KB_TEAM` namespace and context. The word `team` also applies to a personal project using a primary KB. Explicit environment overrides take precedence; missing config falls back to generic names.

If a configured folder is missing, report the path. Ask before creating it. Do not replace it with a remembered directory or another contributor's path. When the primary KB is unavailable, an explicitly named docs index or configured private workbench can still answer a request within its scope.

The primary KB is usually a separate Git checkout. Use `sync` to pull its latest notes and refresh the indexes before relying on shared memory. If a pull fails, resolve the reported problem before treating the notes as current. Private notes stay local.

## Choose the indexes

The helper's `indexes` command lists indexes with their roles and descriptions:

- The primary KB is the project or team's reviewed knowledge, selected by `QMD_KB_PATH` and its namespace.
- A private workbench holds personal working notes at `QMD_WORKBENCH_PATH`. Its index name comes from `QMD_WORKBENCH_INDEX` or the primary namespace.
- Docs indexes describe repositories named in their qmd context. Current code decides what those repositories do today.
- Other indexes need explicit selection when their descriptions match the request. Duplicate indexes over the primary or private folder are skipped by default.

Default searches read the primary KB and docs indexes whose context names the current repository's `owner/name` from `origin`. For a fork, the context must name the fork too, or the agent must choose its index explicitly.

Private notes join default searches only when `QMD_SEARCH_WORKBENCH=always`. Otherwise, add `--with-workbench` when the user asks for personal notes or when the primary KB has nothing on the topic. Name the source when using a private result.

Scope flags go directly after the subcommand:

| Flag | Effect |
| --- | --- |
| `--team` | Select the primary KB. |
| `--workbench` | Select the private workbench only. |
| `--index <name>` | Select a known index; repeat to select several. |
| `--with-workbench` | Add private notes to the selected or default set. |

The first three flags replace the default set. For example, a question about another repository's docs needs `search --team --index <docs-index> "<question>"`. `--workbench` alone searches only private notes.

## Retrieve and verify

Use the helper for search so the selected indexes and source labels remain explicit:

```bash
bash <skill-dir>/scripts/qmd-memory.sh search "<surface> <operation> <known identifiers>"
bash <skill-dir>/scripts/qmd-memory.sh lex '"exact error" "feature flag"'
bash <skill-dir>/scripts/qmd-memory.sh get --index <name> "topic/note.md:80" -l 100
bash <skill-dir>/scripts/qmd-memory.sh multi-get --index <name> "topic/*.md" -l 100
```

`search` runs qmd's hybrid `query`; `lex` runs its keyword `search`. Search stdout is one JSON object with an `indexes` array. Each entry has its own results and, on failure, an error. Keep results separate by source.

`get`, `multi-get`, and `status` read one index. `get` honors a result URI's `?index=<name>` parameter. For a bare path or doc ID, pass the index explicitly when the result came from outside the primary KB. `multi-get` needs an explicit index flag even when its input URIs carry that parameter.

Keep retrieval bounded. The default limit is 10 results per index; use `QMD_LIMIT=6` for a smaller pass. A `multi-get --max-bytes` limit skips whole files that exceed it, so use `-l` when you need short excerpts from long notes.

Before editing code, record a short context pack in the conversation or scratchpad:

- The task and current state.
- Retrieved paths, their `last_updated` dates, and why they matter.
- Decisions to preserve and the evidence behind them.
- Remaining work, relevant source files, and validation commands.
- Any uncertainty that could change the implementation.

Use current code for implementation claims, runtime evidence for observed behavior, and dated decisions for historical rationale. Prefer newer notes only when the evidence is comparable. Read [references/qmd-query-playbook.md](references/qmd-query-playbook.md) for query examples and index selection.

## Save discoveries

Read [references/writeback-protocol.md](references/writeback-protocol.md) before writing memory. Choose the destination before editing:

- Save grounded discoveries about project work in the primary KB when they are useful to other contributors and safe to share.
- Save personal or unverified material in the private workbench. Keep it local and label it as working notes.
- Keep secret values in a secrets manager or local environment. Notes can reference their variable names.

Update an existing topic note when possible. Read the current system date and stamp `last_updated`; give new notes `created`, `last_updated`, `topic`, and `status` frontmatter. Preserve historical dates that describe the evidence.

For a living plan, update the sections that track progress or decisions. A future session should be able to resume from the plan. Use a dated correction when only part of a note is stale; reserve `status: superseded` for a fully replaced note.

When notes disagree, cite the competing claims and their dates. Check the appropriate source of truth, update the stale claim with evidence, and record unresolved questions explicitly. Preserve uncertainty when the evidence cannot resolve it.

## Refresh and publish

Refresh the index after writing notes. For a configured primary KB and optional workbench:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh
```

After writing shared project notes, use `publish "topic: change"` to commit markdown in the KB checkout and refresh the indexes. Inspect changes first because the helper stages markdown throughout that checkout. Keep commits scoped to the requested work and preserve unrelated edits.

The default `review` mode holds commits locally. Show pending commits and ask for push approval unless the session already authorizes that exact set. Run the helper's `push` command after approval. `auto` mode permits pushes within the configured publish window, which defaults to weekdays 09:00-20:00 local time.

Use the helper for KB publishing so its mode and time window apply. Check the real clock. If a push is deferred or fails, report that the note remains local. Private workbench notes use refresh only and are never pushed by this workflow.

The qmd index is derived state outside the repository. After a successful embed, the helper runs cleanup when orphaned vectors reach 10%. Docs indexes have their own sync: update their source checkout, then run `qmd --index <name> update` and `qmd --index <name> embed`.

The helper does not export its resolved names to the parent shell, and qmd does not read `QMD_INDEX` itself. Before a raw qmd command, run the helper's `env` command and type the printed index name after `--index`. An empty `--index` quietly opens qmd's default index.

## Handle failures

Run qmd commands with access to the cache and required GPU resources. On Apple Silicon, model-backed search and embedding need Metal. A sandbox can block cache writes too, so only `env`, `indexes`, and `pending` are expected to work inside one.

Exit 3 means qmd could not run in that environment. For search, all selected indexes failed that way and stdout is empty. Exit 1 can include partial results; inspect each index's error before drawing conclusions.

For `sync`, `publish`, or `push`, a Git step may have succeeded before embedding failed. Check the output and rerun only `refresh` after fixing the environment. Avoid repeating a successful commit or push. Use the harness's supported way to allow cache and GPU access; in Claude Code, this is `dangerouslyDisableSandbox: true` on the Bash call.

If qmd is unavailable, state that retrieval is degraded and use a narrow search over markdown in the selected KB. If a search returns no matches, check that index's status and try a broader query before falling back to a narrow file search. Never treat a failed search as proof that a note does not exist.
