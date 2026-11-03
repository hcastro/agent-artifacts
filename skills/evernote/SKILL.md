---
name: evernote
description: Searches, reads, creates, and updates Evernote notes and tags through bundled TypeScript scripts that call the Evernote API. Converts markdown to ENML and can append to a named section, such as the Tasks, Links, and Notes sections of a sprint note. Use when the user asks to find an Evernote note by tag, title, or content, create or tag a note, add content to an existing note or one of its sections, or list Evernote tags. Requires Node.js 18+ and an EVERNOTE_TOKEN with full-access API permissions.
---

# Evernote Integration

## Setup

The scripts need Node.js 18 or later. Install their dependencies once, from the skill directory:

```bash
cd <skill-dir> && npm install
```

Run every script from `<skill-dir>`. The paths in this file are relative to it.

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
| `search-notes.ts` | Search notes by tag, title, content, or date range. `--title` matches title words by prefix (`--title auth` finds "Authentication notes"), not arbitrary substrings |
| `read-note.ts` | Read full note content with section extraction |
| `create-note.ts` | Create new notes with title, content, tags (markdown by default) |
| `update-note.ts` | Update existing notes — append, modify sections (markdown by default) |
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
- **Tasks** - Section for task items
- **Links** - Section for relevant links
- **Notes** - Section for freeform notes

The API can't create native Evernote tasks. Text added to the Tasks section is plain content, and a markdown `- [ ]` item becomes an ENML checkbox.

### 3. Append to a Note Section

```bash
npx tsx scripts/update-note.ts \
  --guid "note-guid-here" \
  --section "Notes" \
  --append "Decision: Using JWT for auth because..."
```

### 4. Create a Note with Rich Formatting

Content is **markdown by default** — headers, bold, italic, tables, lists, links, and code blocks are all converted to rich Evernote formatting automatically.

```bash
npx tsx scripts/create-note.ts \
  --title "Research Notes" \
  --tags "research,personal" \
  --content "# Main Heading

## Section One

**Bold text** and *italic text* with a [link](https://example.com).

| Column A | Column B |
|----------|----------|
| Data 1   | Data 2   |

- Bullet one
- Bullet two"
```

Use `--format plain` to disable markdown conversion, or `--format enml` to pass raw ENML.

### 5. Search Note Content

```bash
npx tsx scripts/search-notes.ts --query "JWT authentication" --limit 10
```

## References

- [references/enml-guide.md](references/enml-guide.md): read before passing `--format enml` or when Evernote rejects content as invalid ENML.
- [references/api-patterns.md](references/api-patterns.md): read when a task needs an API call the scripts don't cover, such as moving notes between notebooks.
