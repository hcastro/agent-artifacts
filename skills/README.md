# Agent Skills

Agent skills extend AI coding assistants with specialized knowledge, workflows, and tools.

## Available Skills

| Skill | Description |
|-------|-------------|
| [evernote](./evernote) | Integrate Evernote note management into your development workflow |

## Installing Skills

Copy the skill folder to your Claude Code skills directory:

```bash
# Clone this repo and copy the skill
git clone https://github.com/hcastro/agent-artifacts.git
cp -r agent-artifacts/skills/evernote ~/.claude/skills/

# Or copy from a local checkout
cp -r ./skills/evernote ~/.claude/skills/
```

After copying, the skill will be available in Claude Code. You can verify by running `/evernote` or checking `~/.claude/skills/`.

## Creating a New Skill

See the [Anthropic skill-creator template](https://github.com/anthropics/skills/tree/main/skills/skill-creator) for guidelines.

Basic structure:
```
skill-name/
├── SKILL.md          # Required: frontmatter + instructions
├── scripts/          # Executable code
├── references/       # Documentation
└── assets/           # Templates, images, etc.
```

## Skill Anatomy

### SKILL.md (Required)

```yaml
---
name: skill-name
description: |
  Clear description of what the skill does.
  Include specific triggers and use cases.
---

# Skill Name

Instructions for using the skill...
```

### Scripts

Executable code (TypeScript/JavaScript preferred) for operations that need deterministic reliability.

### References

Documentation loaded into context as needed. Keep SKILL.md lean by moving detailed docs here.

### Assets

Files used in output (templates, images, fonts) - not loaded into context.
