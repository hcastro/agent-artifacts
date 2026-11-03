# qmd-memory

This skill makes [qmd](https://github.com/tobi/qmd) the first place a coding agent looks for project memory. Before a broad `grep`, the agent queries a qmd index of your markdown knowledge base and plans. It condenses what it finds into a short context pack and writes new discoveries back to the knowledge base.

The skill assumes no particular company, repository, or folder layout. It's in beta. Reads and queries change nothing, and the helper only prints index changes until you pass `--apply`.

## Before you begin

To use the skill, you need the following:

- qmd, installed as a global tool. Keep qmd out of your project's dependencies. To install it, run `npm install -g @tobilu/qmd`.
- A folder of markdown notes to use as the knowledge base. The helper reads its path from `QMD_KB_PATH`.
- Optional: If qmd's native modules were built under a specific Node.js version managed by nvm, that version in `QMD_NODE_VERSION`, such as `22.14.0`. The variable has an effect only when nvm is installed at `~/.nvm`.

## Install the skill

To install the skill for Claude Code, clone the repository and link the skill into your skills folder:

```bash
git clone https://github.com/hcastro/agent-artifacts.git
mkdir -p ~/.claude/skills
ln -s "$PWD/agent-artifacts/skills/qmd-memory" ~/.claude/skills/qmd-memory
```

The link keeps the skill current when you run `git pull` in the clone. For other install locations, see [Install a skill](../../README.md#install-a-skill).

## Set up the memory index

The helper finds the project from the directory you run it in, so run it from your project root. To create the index, follow these steps:

1. Set the path to your knowledge base and preview the setup commands:

   ```bash
   export QMD_KB_PATH=/absolute/path/to/knowledge-base
   bash ~/.claude/skills/qmd-memory/scripts/qmd-memory.sh setup
   ```

   The helper prints the qmd commands it would run and changes nothing.

1. Review the printed commands, then apply them:

   ```bash
   bash ~/.claude/skills/qmd-memory/scripts/qmd-memory.sh setup --apply
   ```

1. After you add or change notes, refresh the index the same way. Run `refresh` to preview and `refresh --apply` to apply:

   ```bash
   bash ~/.claude/skills/qmd-memory/scripts/qmd-memory.sh refresh --apply
   ```

If `QMD_KB_PATH` isn't set, the helper looks for `knowledge-base`, `kb`, or `docs/knowledge-base` under the project root. It indexes project plans from `QMD_PLANS_PATH`, or from the first of `docs/plans`, `plans`, or `.plans` that exists.

### Environment variables

The helper reads the following environment variables. To print their current values, run the helper with no arguments.

| Variable | Default | Purpose |
|---|---|---|
| `QMD_KB_PATH` | First of `knowledge-base`, `kb`, `docs/knowledge-base` | Folder of knowledge-base notes. |
| `QMD_PLANS_PATH` | First of `docs/plans`, `plans`, `.plans` | Optional folder of project plans. |
| `QMD_REPO_PATH` | `git rev-parse --show-toplevel`, or the current directory | Project root that the default paths are relative to. |
| `QMD_INDEX` | `memory` | Name of the qmd index. |
| `QMD_KB_COLLECTION` | `knowledge-base` | qmd collection name for the knowledge base. |
| `QMD_PLANS_COLLECTION` | `project-plans` | qmd collection name for plans. |
| `QMD_KB_MASK` | `**/*.md` | Files to index in the knowledge base. |
| `QMD_PLANS_MASK` | `**/*.md` | Files to index in the plans folder. |
| `QMD_LIMIT` | `10` | Results returned by `search` and `lex`. |
| `QMD_MIN_SCORE` | `0.25` | Lowest score that `search` returns. |
| `QMD_GLOBAL_CONTEXT` | A description of project memory | Context text that `setup` attaches to the whole index. |
| `QMD_KB_CONTEXT` | A description of the knowledge base | Context text for the knowledge-base collection. |
| `QMD_PLANS_CONTEXT` | A description of the plans folder | Context text for the plans collection. |
| `QMD_APPLY` | `0` | Set to `1` to apply `setup` and `refresh` changes, the same as `--apply`. |
| `QMD_NODE_VERSION` | Not set | nvm Node.js version to switch to before running qmd. Needs nvm at `~/.nvm`. |

## Use the skill

Ask your coding agent for prior context in plain words. The following requests trigger the skill:

- "Use qmd memory to get the context for this feature before you edit it."
- "Find the decisions and validation gates for this migration."
- "We found a new vendor gotcha. Update durable memory and refresh qmd."
- "Two knowledge-base notes disagree. Resolve the contradiction before coding."

The skill produces a short context pack before any broad code search. The agent follows the workflow in [`SKILL.md`](SKILL.md).

## Optional: Expose qmd as an MCP server

The skill works with the qmd CLI alone. To give an MCP client direct access to qmd, start the HTTP server:

```bash
qmd mcp --http --daemon
```

Then point the client at `http://localhost:8181/mcp`. qmd also supports a stdio setup. For details, see the [qmd README](https://github.com/tobi/qmd).

## Contents

The skill folder holds the following files:

- `SKILL.md`: the retrieval and writeback workflow the agent follows.
- `references/qmd-query-playbook.md`: query templates and retrieval patterns for large tasks.
- `references/writeback-protocol.md`: how to update the knowledge base without stale, duplicate, or contradictory notes.
- `scripts/qmd-memory.sh`: the helper for setup, refresh, and search.
- `evals/evals.json`: test prompts that the skill-creator skill uses to check this skill.
