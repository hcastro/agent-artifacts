---
name: evernote
description: |
  Integrate Evernote note management into your development workflow.
  Use when you need to: (1) Search and retrieve notes by tag, title, or content,
  (2) Create new notes with proper tagging and notebook assignment,
  (3) Update existing notes (append content, add to sections, modify text),
  (4) Manage sprint/project notes with Tasks/Links/Notes structure,
  (5) List and manage tags across your Evernote account.
  Requires EVERNOTE_TOKEN environment variable set to your developer token.
---

# Evernote Integration

Manage your Evernote notes directly from Claude Code. Search, create, update, and organize notes without leaving your development environment.

## Setup

Set your Evernote developer token as an environment variable:

```bash
export EVERNOTE_TOKEN="your-developer-token"
```

Get a developer token at: https://dev.evernote.com/doc/

## Available Scripts

All scripts are in `scripts/` and can be run with `npx ts-node`:

| Script | Purpose |
|--------|---------|
| `search-notes.ts` | Search notes by tag, title, content, or date range |
| `read-note.ts` | Read full note content with section extraction |
| `create-note.ts` | Create new notes with title, content, tags |
| `update-note.ts` | Update existing notes (append, modify sections) |
| `list-tags.ts` | List all tags with note counts |

## Common Workflows

### 1. Search Notes by Tag

```bash
npx ts-node scripts/search-notes.ts --tag "weekly-work-notes" --limit 5
```

### 2. Create a Sprint Note

```bash
npx ts-node scripts/create-note.ts \
  --title "Project Auth Sprint 01202026 - 02032026" \
  --tags "weekly-work-notes,auth,project" \
  --template sprint
```

This creates a note with the standard structure:
- **Tasks** - Section for Evernote tasks
- **Links** - Section for relevant links
- **Notes** - Section for freeform notes

### 3. Append to a Note Section

```bash
npx ts-node scripts/update-note.ts \
  --guid "note-guid-here" \
  --section "Notes" \
  --append "Decision: Using JWT for auth because..."
```

### 4. Search Note Content

```bash
npx ts-node scripts/search-notes.ts --query "JWT authentication" --limit 10
```

## Sprint Note Structure

The skill supports a standard sprint note structure with three sections:

```
# Tasks
[Evernote native tasks go here]

# Links
- [Link 1](url)
- [Link 2](url)

# Notes
- Bullet points
- Code blocks
- Freeform text
```

## References

- [ENML Guide](references/enml-guide.md) - Understanding Evernote's markup language
- [API Patterns](references/api-patterns.md) - Common API usage patterns

## Error Handling

All scripts will exit with helpful error messages if:
- `EVERNOTE_TOKEN` is not set
- Token is invalid or expired
- Note/tag not found
- Network errors occur

## Authentication for Other Users

If you're adopting this skill, you need your own Evernote developer token:

1. Go to https://dev.evernote.com/doc/
2. Sign in with your Evernote account
3. Generate a developer token
4. Set it as `EVERNOTE_TOKEN` environment variable

Developer tokens provide full access to your Evernote account. Keep them secure and never commit them to version control.
