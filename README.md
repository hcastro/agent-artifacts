# Agent Artifacts

A collection of AI agent configurations, skills, and rules for Claude Code, Cursor, and other AI-powered development tools.

## Overview

This repository contains reusable artifacts that extend and customize AI-powered development tools:

| Directory | Description |
|-----------|-------------|
| `skills/` | Agent skills for Claude Code and other AI assistants |
| `cursor-rules/` | Project rules for Cursor IDE (`.mdc` files for `.cursor/rules/`) |
| `mcp-servers/` | Model Context Protocol server implementations |
| `shared/` | Shared utilities across tools |

## Quick Start

### Installing a Skill

```bash
# Clone and copy to Claude Code skills directory
git clone https://github.com/hcastro/agent-artifacts.git
cp -r agent-artifacts/skills/<skill-name> ~/.claude/skills/
```

### Using Cursor Rules

Cursor now uses `.cursor/rules/` with `.mdc` files instead of the deprecated `.cursorrules` file. Copy rule files to your project:

```bash
# Create the rules directory and copy rules
mkdir -p /path/to/your/project/.cursor/rules
cp cursor-rules/*.mdc /path/to/your/project/.cursor/rules/
```

See [Cursor Rules documentation](https://docs.cursor.com/context/rules) for more details.

## Available Skills

| Skill | Path | Description | Setup |
|-------|------|-------------|-------|
| Evernote | [`skills/evernote`](./skills/evernote) | Search, read, create, update, and tag Evernote notes from an agent workflow. | Set `EVERNOTE_TOKEN`; run scripts with `npx tsx`. |
| Jira | [`skills/jira`](./skills/jira) | Query, create, edit, transition, assign, and comment on Jira Cloud tickets using `acli` or REST API v3. | Configure Jira credentials and run the skill's project configuration flow. |
| LastPass | [`skills/lastpass`](./skills/lastpass) | Search, show, generate, create, update, copy, and export LastPass vault entries via `lpass`. | Install `lastpass-cli` and log in with `lpass login`. |
| QMD Knowledge Base Memory | [`skills/qmd-knowledge-base-memory`](./skills/qmd-knowledge-base-memory) | Beta: use qmd as a retrieval and writeback layer for persistent markdown project memory. | Install qmd externally and set `QMD_KB_PATH` or use a repo-local `knowledge-base`. |
| Strategic Code Design | [`skills/strategic-code-design`](./skills/strategic-code-design) | Apply strategic design, correctness, review, refactoring, and complexity-management workflows to production code changes. | No external setup required. |

See [`skills/README.md`](./skills/README.md) and each skill's `SKILL.md` for detailed usage.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding a New Skill

1. Create a new directory under `skills/`
2. Follow the [Anthropic skill-creator template](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
3. Include a `SKILL.md` with proper frontmatter
4. Add scripts, references, and assets as needed
5. Submit a PR with documentation

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Anthropic Skills](https://github.com/anthropics/skills) - Skill template and patterns
- [Evernote SDK](https://github.com/evernote/evernote-sdk-js) - Official Evernote JavaScript SDK
- [qmd](https://github.com/tobi/qmd) - Markdown search and retrieval engine used by the qmd knowledge-base memory skill
