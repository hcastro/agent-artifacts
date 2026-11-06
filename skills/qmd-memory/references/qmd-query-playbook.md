# QMD query playbook

Use this reference when the first search leaves a question unanswered. Choose words from the project's notes and `.kb-config` contexts.

In these examples, `qmd-memory.sh` means `bash <skill-dir>/scripts/qmd-memory.sh`. Run it from the project you are working on so the helper can identify its remote.

## Select the sources

Run `indexes` to see the available sources. Default searches read the primary KB and docs indexes whose context names the current repository. Add private notes with `--with-workbench` when the user requests them, or when the primary KB has no relevant result.

For a question about another repository, choose its docs index explicitly:

```bash
qmd-memory.sh search --team --index reader-docs "release process for the reader app"
```

To search only personal notes:

```bash
qmd-memory.sh search --workbench "apartment administration contact"
```

`--team`, `--workbench`, and `--index` replace the default set. Each result retains its index and source label. Keep those labels when using the results in an answer.

## Build a query

Start with the surface and operation. Add identifiers that distinguish the task, such as a ticket or feature flag. For example:

```bash
qmd-memory.sh search "PROJ-1234 anonymous checkout reads cold cache validation"
```

Use `lex` for an exact error or identifier:

```bash
qmd-memory.sh lex '"NEW_CHECKOUT_ENABLED" "getOrdersForAnonymousUser"'
```

When the task needs the reason for a decision, ask for it:

```bash
QMD_LIMIT=6 qmd-memory.sh search "why keep the legacy order fanout during migration"
```

`search` runs qmd's hybrid query with a default score floor of 0.25. `lex` runs keyword search without that floor. Both return at most 10 results per index unless you set `QMD_LIMIT`.

## Read sections

Open a result near its relevant lines before requesting the full document:

```bash
qmd-memory.sh get --index reader-docs "runbooks/releases.md:40" -l 100
qmd-memory.sh multi-get --index reader-docs "runbooks/*.md" -l 80
```

`get` can use a full result URI carrying `?index=<name>`. `multi-get` needs the index flag explicitly. For a bare path or doc ID, choose the result's index when it came from outside the primary KB.

Use `-l` to limit excerpts. `--max-bytes` skips entire files that exceed the limit, which can hide a long note containing the answer. Read a full document when its overall structure matters or it is short enough to fit the task.

## Use the result

Record the notes that change the task and the evidence behind them. Before editing code, identify the affected files and the tests that establish the required behavior. Stop querying memory when the remaining question can be answered from those files.

For a long-running task, search its phase and remaining work:

```bash
qmd-memory.sh search "Phase 2 order history migration remaining work"
```

For a runtime failure, search the exact message and command:

```bash
qmd-memory.sh lex '"TLS issuer" "next start"'
```

If an index fails, inspect its error. A failed query gives no evidence about whether the note exists. Exit 3 means the environment blocked all selected indexes; partial failures return exit 1 with separate errors in the JSON output.

## Use raw qmd deliberately

The helper resolves the primary index from `.kb-config` without exporting `QMD_INDEX` to the parent shell. qmd also ignores that environment variable. An empty `--index "$QMD_INDEX"` opens its default index, which can return stale or unrelated notes.

Run `qmd-memory.sh env` first and type its printed index name after `qmd --index`. Use raw qmd for operations the helper does not cover, such as refreshing a standalone docs index.
