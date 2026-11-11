# qmd-memory

`qmd-memory` helps an agent find past decisions in a markdown knowledge base and save what it learns. It searches with [qmd](https://github.com/tobi/qmd), retrieves the relevant sections, and checks them against current evidence before using them.

Use it with any repository. You choose the knowledge-base path and index names. The skill keeps project knowledge separate from private working notes and can search documentation indexes that describe the current repository.

## Requirements

- Bash, Git, and the usual Unix command-line tools.
- qmd 2.8 or later, installed globally with `npm install -g @tobilu/qmd@latest`.
- Node.js on `PATH` to parse search results as JSON. Use the Node.js installation that owns qmd so its native modules load correctly.
- An existing folder of markdown notes. Git is needed for the helper's sync and publish commands.

The helper puts qmd's bin directory first on `PATH`. If qmd is missing, it tries the default nvm environment. It never installs qmd for you.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `qmd-memory`.

If you already have a QMD memory skill installed under another name, remove the old installation to avoid duplicate instructions. Then choose a knowledge base as described below.

## Choose a knowledge base

Set `QMD_KB_PATH` to the primary knowledge base for the project you are working on:

```bash
export QMD_KB_PATH="/absolute/path/to/project-notes"
```

A knowledge base can hold notes for one repository or several related repositories. For a single, lasting scope, put the export in a machine-local shell profile. If you work across unrelated projects, set it in each project's shell environment. The helper reads the exported value on every call.

The skill never chooses a knowledge base from an employer name or assumes a path under your home directory. A user-level install makes the skill available across repositories; your environment selects which notes it reads.

### Name the scope

Put a `.kb-config` file at the knowledge-base root:

```bash
KB_TEAM="sample"
KB_TEAM_DESCRIPTION="Project decisions and runbooks for sample/reader."
KB_PUBLISH_MODE="review"
KB_CONTEXT_1="imports|Import formats and recovery procedures."
```

`KB_TEAM` is the namespace used to name the index. It can describe a personal project or a team. The example creates index `sample`, collection `sample-kb`, and an optional private index named `sample-workbench`. You can override those names with environment variables.

The helper reads `.kb-config` as data. It accepts known `KEY="value"` lines and ignores shell code. With no config file, names fall back to `team`, `team-kb`, and `team-workbench`; set a namespace before managing several knowledge bases.

### Add private working notes

To keep personal notes in a separate, local index:

```bash
export QMD_WORKBENCH_PATH="/absolute/path/to/private-notes"
export QMD_WORKBENCH_INDEX="personal-notes"
```

Private notes join a search when you pass `--with-workbench` or `--workbench`. Set `QMD_SEARCH_WORKBENCH=always` if you want them in every default search. Results identify their source so an agent can distinguish personal notes from reviewed project knowledge.

You can read a configured private index without a primary KB:

```bash
bash <skill-dir>/scripts/qmd-memory.sh lex --workbench "apartment administration"
```

That command needs both workbench exports above. Refresh it directly with `qmd --index personal-notes update` followed by `qmd --index personal-notes embed`. The helper's `setup` needs `QMD_KB_PATH`. Its `refresh` also manages the primary index, whose name comes from that path's config or an explicit `QMD_INDEX`.

## Build and check the indexes

Run these commands from the project root, replacing `<skill-dir>` with the installed skill's directory:

```bash
bash <skill-dir>/scripts/qmd-memory.sh env
bash <skill-dir>/scripts/qmd-memory.sh setup
bash <skill-dir>/scripts/qmd-memory.sh indexes
bash <skill-dir>/scripts/qmd-memory.sh search "a topic covered in the notes"
```

`setup` adds collections and contexts, then updates the index and its embeddings. It also indexes the optional planning directory selected by `KB_PLANS_DIR` or `QMD_PLANS_DIR`, relative to the current repository. The default is `.cursor/planning`.

Run qmd commands with access to its cache and, on Apple Silicon, Metal. The helper exits 3 when a sandbox prevents them from running. Its `env`, `indexes`, and `pending` commands only read configuration or Git and can run inside a sandbox.

## Search

| Command | Reads |
| --- | --- |
| `search "question"` | Hybrid search across the primary KB and matching repository docs. |
| `lex "exact terms"` | Keyword search across the same indexes. |
| `search --with-workbench "question"` | The default set plus private notes. |
| `search --workbench "question"` | Private notes only. |
| `search --team --index docs-name "question"` | The primary KB and the named index. |
| `get --index docs-name "path.md:40" -l 80` | A section from one index. |
| `multi-get --index docs-name "topic/*.md" -l 80` | Sections from several files in one index. |
| `indexes` | Available indexes and how searches select them. |

Scope flags go directly after the command. `--team`, `--workbench`, and `--index` replace the default search set; `--with-workbench` adds private notes to that set. Search output is one JSON object containing separate results for each index.

Repository docs join the default set when their qmd context names the current repository's `owner/name`, read from its `origin` remote. For example:

```bash
qmd --index reader-docs context add -- / "Runbooks for sample/reader and sample/reader-components."
```

For another repository's docs, choose the index explicitly with `--index`. Docs indexes have their own update cycle; the helper refreshes the primary KB and private workbench.

## Save and share notes

After editing notes, run `refresh`. To pull the primary KB and refresh its indexes, run `sync`:

```bash
bash <skill-dir>/scripts/qmd-memory.sh refresh
bash <skill-dir>/scripts/qmd-memory.sh sync
```

For reviewed project notes in a Git repository, `publish "topic: change"` commits markdown and refreshes the indexes. The default `review` mode holds the commit locally until the user approves a push. The helper's `pending` command lists those commits, and `push` sends the approved set.

`KB_PUBLISH_MODE="auto"` permits pushes during the configured publish window. The default window is weekdays, 09:00-20:00 in the machine's local time. Private workbench notes stay local and use refresh only.

## Configuration reference

Names resolve from explicit environment variables, then `.kb-config`, then generic defaults.

| Environment variable | Purpose |
| --- | --- |
| `QMD_KB_PATH` | Primary knowledge-base folder. |
| `QMD_INDEX`, `QMD_KB_COLLECTION` | Override its index and collection names. |
| `QMD_REPO_PATH` | Project root; otherwise derived from Git or the current directory. |
| `QMD_WORKBENCH_PATH`, `QMD_WORKBENCH_INDEX` | Private notes folder and index. |
| `QMD_SEARCH_WORKBENCH` | `on-request` (default) or `always`. |
| `QMD_PLANS_DIR`, `QMD_PLANS_COLLECTION` | Optional planning directory and collection. |
| `QMD_PUBLISH_MODE` | Override `review` or `auto` for this machine. |
| `QMD_LIMIT`, `QMD_MIN_SCORE` | Result limit (10) and hybrid search score floor (0.25). |
| `QMD_ORPHAN_CLEANUP_PERCENT` | Run cleanup when orphaned vectors reach this percentage (10). |

`.kb-config` also accepts `KB_PLANS_DIR`, `KB_PLANS_COLLECTION`, and numbered `KB_CONTEXT_<n>` entries. Set the publish window with `KB_PUBLISH_START_HOUR`, `KB_PUBLISH_END_HOUR`, and `KB_PUBLISH_WEEKDAYS_ONLY`.

### Changes from the earlier personal version

`setup` and `refresh` now run immediately. The earlier `--apply` flag and `QMD_APPLY` variable have been removed. Index names come from the configured scope rather than defaulting to `memory`.

Use `QMD_PLANS_DIR` for the optional planning directory. The earlier `QMD_PLANS_PATH`, mask overrides, and context-text overrides are replaced by the configuration above. `QMD_NODE_VERSION` is also removed; the helper uses the Node.js installation beside qmd.

## Use with an agent

Ask for a task such as "Find the decisions for this migration before editing" or "Save this discovery in the project KB and refresh it." For personal notes, say so in the request. The agent follows [SKILL.md](SKILL.md) and retrieves only the sections it needs.

To check the helper's routing in an isolated environment, run:

```bash
python3 skills/qmd-memory/evals/test_helper.py
```
