# Cursor Rules

`.cursorrules` configuration files for Cursor IDE.

## Overview

Cursor rules customize how Cursor's AI assistant behaves in your projects. Place a `.cursorrules` file in your project root to apply custom rules.

## Available Rules

*Coming soon*

## Usage

Copy a rules file to your project:

```bash
cp cursor-rules/example.cursorrules /path/to/project/.cursorrules
```

## Creating Rules

A `.cursorrules` file contains instructions that guide Cursor's AI behavior:

```
# Project Rules

## Code Style
- Use TypeScript strict mode
- Prefer functional components in React
- Use named exports

## Architecture
- Follow the repository pattern for data access
- Keep components under 200 lines

## Testing
- Write tests for all new functions
- Use React Testing Library for component tests
```
