# Cursor Rules

Project rules for Cursor IDE using the `.cursor/rules/` directory format.

## Overview

Cursor now uses `.mdc` files in a `.cursor/rules/` directory instead of the deprecated `.cursorrules` file. Rules can be scoped to specific file patterns and are version-controlled with your project.

## Available Rules

*Coming soon*

## Usage

Copy rule files to your project's `.cursor/rules/` directory:

```bash
mkdir -p /path/to/project/.cursor/rules
cp cursor-rules/*.mdc /path/to/project/.cursor/rules/
```

## Creating Rules

Create `.mdc` files in `.cursor/rules/` with frontmatter for configuration:

```markdown
---
description: TypeScript coding standards
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
---

# TypeScript Rules

## Code Style
- Use TypeScript strict mode
- Prefer functional components in React
- Use named exports

## Architecture
- Follow the repository pattern for data access
- Keep components under 200 lines
```

### Rule Properties

| Property | Description |
|----------|-------------|
| `description` | Brief description shown in Cursor UI |
| `globs` | File patterns this rule applies to (e.g., `["**/*.ts"]`) |
| `alwaysApply` | If `true`, rule is always included in context |

## References

- [Cursor Rules Documentation](https://docs.cursor.com/context/rules)
