# qmd-knowledge-base-memory skill

This skill turns qmd into the retrieval and writeback layer for a persistent markdown knowledge base. It is designed for coding agents that need durable project memory across sessions without assuming any specific company, repository, or project structure.

Status: beta for public use. Read/query workflows are safe by default. qmd index mutations are dry-run unless explicitly applied.

## Install

Copy the folder into your agent skills directory:

```bash
mkdir -p ~/.claude/skills
cp -R qmd-knowledge-base-memory ~/.claude/skills/
chmod +x ~/.claude/skills/qmd-knowledge-base-memory/scripts/qmd-memory.sh
```

Install qmd globally or run it externally. Do not add qmd as a project dependency unless you intentionally want a repository dependency change.

```bash
npm install -g @tobilu/qmd
# or
bun install -g @tobilu/qmd
```

If qmd was installed under a specific nvm Node version, set `QMD_NODE_VERSION` before using the helper:

```bash
export QMD_NODE_VERSION=22.14.0
```

## Setup the memory index

From the project root:

```bash
export QMD_KB_PATH=/absolute/path/to/knowledge-base
bash ~/.claude/skills/qmd-knowledge-base-memory/scripts/qmd-memory.sh setup
```

`setup` and `refresh` print qmd mutation commands by default. After reviewing them, apply explicitly:

```bash
bash ~/.claude/skills/qmd-knowledge-base-memory/scripts/qmd-memory.sh setup --apply
bash ~/.claude/skills/qmd-knowledge-base-memory/scripts/qmd-memory.sh refresh --apply
```

Defaults:

```bash
QMD_INDEX=memory
QMD_KB_COLLECTION=knowledge-base
QMD_REPO_PATH=$(git rev-parse --show-toplevel || pwd)
QMD_PLANS_COLLECTION=project-plans
```

If `QMD_KB_PATH` is not set, the helper looks for `knowledge-base`, `kb`, or `docs/knowledge-base` under the project root. Set `QMD_PLANS_PATH` to index project plans, or let the helper detect common directories like `docs/plans`, `plans`, or `.plans`.

## Use

Ask your coding agent things like:

- "Use qmd memory to retrieve the latest context before editing this feature."
- "Find the decisions and validation gates for this migration."
- "We found a new vendor gotcha; update durable memory and refresh qmd."
- "Two knowledge-base notes disagree; resolve the contradiction before coding."

The skill should produce a compact context pack before broad code search.

## Optional MCP setup

qmd can also be exposed as an MCP server:

```bash
qmd mcp --http --daemon
```

Then point an MCP client at `http://localhost:8181/mcp`, or configure your agent/IDE with qmd's plugin or stdio setup as preferred. The skill still works with CLI-only qmd.
