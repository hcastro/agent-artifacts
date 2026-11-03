---
name: lastpass
description: Searches, reads, generates, creates, and updates LastPass vault entries through the lpass CLI. Use when the user asks for a password, username, URL, TOTP seed, or secure note stored in LastPass, wants to copy a password to the clipboard, generate or save a password, move or delete an entry, or export the vault.
---

# LastPass

Manage the LastPass vault via `lpass` CLI commands.

## Prerequisites

1. `lpass` CLI installed (`brew install lastpass-cli`)
2. User must be logged in. Check with `lpass status`.
3. If not logged in, the user must run `lpass login EMAIL` interactively (requires TTY for master password)

## Common Operations

### Check login status
```bash
lpass status
```

### Search / list entries
```bash
lpass ls                          # all entries, tree view
lpass ls "Social Media"           # entries in a folder
lpass ls | grep -i "github"                 # find entries by name without printing secrets
lpass show "exact name" --username          # one entry's username, no password
```

### Get credentials
```bash
lpass show "Site Name" --password           # password only
lpass show "Site Name" --username           # username only
lpass show "Site Name" --url                # URL only
lpass show "Site Name" --notes              # secure notes
lpass show "Site Name" --field="TOTP"       # custom field (e.g. TOTP seed)
lpass show "Site Name" --clip               # copy password to clipboard
lpass show "Site Name" --json               # full entry as JSON, INCLUDING the password
```

### Generate passwords
```bash
lpass generate "Folder/Site Name" 24                        # 24-char password
lpass generate "Folder/Site Name" 32 --no-symbols           # no special chars
lpass generate "New Site" 20 --username=user@email.com --url=https://example.com
```

### Create / update entries
```bash
echo "mypassword" | lpass add --non-interactive --password "Folder/Entry Name"
echo "updated notes" | lpass edit --non-interactive --notes "Entry Name"
```

### Move / delete
```bash
lpass mv "Entry Name" "New Folder"
lpass rm "Entry Name"
```

### Export
```bash
lpass export --fields=name,username,password,url,grouping > EXPORT_PATH.csv   # only after the user confirms; never print the file
```

Tell the user where the file is and to delete it when they're done.

## Security Rules

- NEVER display raw passwords in chat messages unless the user explicitly asks
- Prefer `--clip` to copy to clipboard instead of printing passwords
- `lpass show NAME` and `lpass show NAME --json` both print the password. To show an entry, ask for one field at a time with `--username`, `--url`, `--notes` or `--field`.
- Never export the full vault without explicit user confirmation

## Reference

For full CLI options and format strings, see [lpass-reference.md](references/lpass-reference.md).
