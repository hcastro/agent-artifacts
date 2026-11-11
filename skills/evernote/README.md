# evernote

This skill lets your agent search, read, create, and update your Evernote notes and tags. It runs bundled TypeScript scripts that call the Evernote API, converts markdown to ENML (Evernote's note format), and can add content to a named section of a note, such as the Tasks, Links, and Notes sections of a sprint note.

## Before you begin

To use the skill, you need the following:

- Node.js 18 or later.
- An Evernote API key with full access. A basic key can't read or change existing notes, and its requests fail with `PERMISSION_DENIED`.
- An OAuth access token from that key, or a developer token you already have. The skill reads it from the `EVERNOTE_TOKEN` environment variable. Evernote doesn't issue new developer tokens.

For more information about API keys and OAuth, see the [Evernote authentication guide](https://dev.evernote.com/doc/articles/authentication.php).

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `evernote`.

Then complete these steps from the installed skill folder:

1. Install the script dependencies inside the skill folder:

   ```bash
   npm install
   ```

1. Add your token to your shell profile, such as `~/.zshrc`:

   ```bash
   export EVERNOTE_TOKEN="EVERNOTE_TOKEN_VALUE"
   ```

   Replace `EVERNOTE_TOKEN_VALUE` with your OAuth access token or developer token. Open a new terminal so the variable is set.

1. From the skill folder, check that the token works:

   ```bash
   npx tsx scripts/auth-verify.ts
   ```

   The script prints your Evernote username when the token is valid.

## Use the skill

Ask your agent for what you want in plain words. The following requests trigger the skill:

- "Find my Evernote notes tagged `weekly-notes` from the last two weeks."
- "Create a sprint note called Project Alpha Sprint 2026-01-20 with the `weekly-notes` tag."
- "Add this decision to the Notes section of my Project Alpha sprint note: we're using JWT for auth."

The agent follows the workflows in [`SKILL.md`](SKILL.md). It writes content as markdown by default, and the scripts convert it to ENML.

The Evernote API can't create native Evernote tasks. Text that the skill adds to a Tasks section is plain note content, and a markdown `- [ ]` item becomes an ENML checkbox.

## Scripts

The following table lists the scripts in `scripts/`. Run each one from the skill folder with `npx tsx scripts/SCRIPT_NAME`. Every script except `auth-verify.ts` prints its options when you pass `--help`.

| Script | Purpose |
|--------|---------|
| `auth-verify.ts` | Verify your token is valid and see your username |
| `search-notes.ts` | Search notes by tag, title, content, or date range. `--title` matches title words by prefix, so `--title auth` finds "Authentication notes" |
| `read-note.ts` | Read full note content with section extraction |
| `create-note.ts` | Create new notes with title, content, tags (markdown by default) |
| `update-note.ts` | Append to a note, prepend or append to a section, and add or remove tags (markdown by default) |
| `list-tags.ts` | List all tags with note counts |

## Keep your token safe

Your token gives full access to your Evernote account. To protect it, follow these practices:

- Never commit tokens to version control.
- If your token is compromised, revoke it immediately in your Evernote account settings.
