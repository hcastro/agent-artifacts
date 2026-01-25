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

## Authentication

Set your Evernote access token as an environment variable:

```bash
export EVERNOTE_TOKEN="your-token-here"
```

### Getting a Token

`EVERNOTE_TOKEN` can be either:

1. **OAuth Access Token** (recommended) - Evernote's standard authentication method
2. **Developer Token** (legacy) - If you already have one

#### OAuth Access Token (Recommended)

Evernote now requires OAuth for new API access. To get an OAuth token:

1. Register your application at https://dev.evernote.com/
2. Request API key access (you'll need a consumer key and secret)
3. Implement the OAuth flow or use a tool to complete the authorization
4. Use the resulting access token as `EVERNOTE_TOKEN`

**Note:** OAuth API keys can be "basic" or "full access". This skill requires **full access** to read and modify existing notes. Basic keys will receive `PERMISSION_DENIED` errors.

For OAuth implementation details, see: https://dev.evernote.com/doc/articles/authentication.php

#### Developer Token (Legacy)

Developer tokens are no longer generally available from Evernote. If you already have one, it will work with this skill. Set it as `EVERNOTE_TOKEN`.

### Verify Your Token

After setting your token, verify it works:

```bash
npx tsx scripts/auth-verify.ts
```

This confirms your token is valid and shows your Evernote username.

## Available Scripts

All scripts are in `scripts/` and can be run with `npx tsx`:

| Script | Purpose |
|--------|---------|
| `auth-verify.ts` | Verify your token is valid and see your username |
| `search-notes.ts` | Search notes by tag, title, content, or date range |
| `read-note.ts` | Read full note content with section extraction |
| `create-note.ts` | Create new notes with title, content, tags |
| `update-note.ts` | Update existing notes (append, modify sections) |
| `list-tags.ts` | List all tags with note counts |

## Common Workflows

### 1. Search Notes by Tag

```bash
npx tsx scripts/search-notes.ts --tag "weekly-notes" --limit 5
```

### 2. Create a Sprint Note

```bash
npx tsx scripts/create-note.ts \
  --title "Project Alpha Sprint 2026-01-20" \
  --tags "weekly-notes,project-alpha" \
  --template sprint
```

This creates a note with the standard structure:
- **Tasks** - Section for Evernote tasks
- **Links** - Section for relevant links
- **Notes** - Section for freeform notes

### 3. Append to a Note Section

```bash
npx tsx scripts/update-note.ts \
  --guid "note-guid-here" \
  --section "Notes" \
  --append "Decision: Using JWT for auth because..."
```

### 4. Search Note Content

```bash
npx tsx scripts/search-notes.ts --query "JWT authentication" --limit 10
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

## Security Notes

- Never commit tokens to version control
- Evernote tokens provide full access to your account - keep them secure
- If your token is compromised, revoke it immediately in your Evernote account settings
