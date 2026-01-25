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
cp -r agent-artifacts/skills/evernote ~/.claude/skills/
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

### Evernote (`skills/evernote`)

Integrate Evernote note management into your development workflow.

**Features:**
- Search notes by tag, title, or content
- Create new notes with proper structure and tagging
- Update existing notes (append content, modify sections)
- Manage sprint/project notes with Tasks/Links/Notes structure

**Setup:**
```bash
export EVERNOTE_TOKEN="your-token-here"
```

See [full documentation](./skills/evernote/SKILL.md) for authentication options (OAuth recommended, legacy developer tokens also supported).

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
