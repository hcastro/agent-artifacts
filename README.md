# Agent Artifacts

A collection of AI agent configurations, skills, and rules for Claude Code, Cursor, and other AI-powered development tools.

## Overview

This repository contains reusable artifacts that extend and customize AI-powered development tools:

| Directory | Description |
|-----------|-------------|
| `claude-skills/` | Claude Code skills (`.skill` packages) |
| `claude-commands/` | Custom slash commands for Claude Code |
| `cursor-rules/` | `.cursorrules` configuration files |
| `cursor-commands/` | Custom Cursor commands |
| `mcp-servers/` | Model Context Protocol server implementations |
| `shared/` | Shared utilities across tools |

## Quick Start

### Installing a Claude Skill

```bash
# Install a skill from this repo
claude skill install https://github.com/hcastro/agent-artifacts/releases/download/v1.0.0/evernote.skill

# Or install locally during development
claude skill install ./claude-skills/evernote
```

### Using Cursor Rules

Copy any `.cursorrules` file to your project root:

```bash
cp cursor-rules/typescript-react.cursorrules /path/to/your/project/.cursorrules
```

## Available Skills

### Evernote (`claude-skills/evernote`)

Integrate Evernote note management into your development workflow.

**Features:**
- Search notes by tag, title, or content
- Create new notes with proper structure and tagging
- Update existing notes (append content, modify sections)
- Manage sprint/project notes with Tasks/Links/Notes structure

**Setup:**
```bash
# Set your Evernote developer token
export EVERNOTE_TOKEN="your-token-here"

# Get a token at: https://dev.evernote.com/doc/
```

[Full documentation](./claude-skills/evernote/README.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding a New Skill

1. Create a new directory under `claude-skills/`
2. Follow the [Anthropic skill-creator template](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
3. Include a `SKILL.md` with proper frontmatter
4. Add scripts, references, and assets as needed
5. Submit a PR with documentation

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Anthropic Skills](https://github.com/anthropics/skills) - Skill template and patterns
- [Evernote SDK](https://github.com/evernote/evernote-sdk-js) - Official Evernote JavaScript SDK
