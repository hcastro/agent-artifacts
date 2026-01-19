# Agent Skills

Agent skills extend AI coding assistants with specialized knowledge, workflows, and tools.

## Available Skills

| Skill | Description |
|-------|-------------|
| [evernote](./evernote) | Integrate Evernote note management into your development workflow |

## Installing Skills

```bash
# Install from release
claude skill install https://github.com/hcastro/agent-artifacts/releases/download/v1.0.0/skill-name.skill

# Install locally during development
claude skill install ./skill-name
```

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
