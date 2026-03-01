---
name: lastpass
description: |
  Manage LastPass password vault via the `lpass` CLI. Use when you need to:
  (1) Search or list passwords, credentials, or secure notes,
  (2) Show usernames, passwords, URLs, or custom fields for an entry,
  (3) Generate new passwords for sites,
  (4) Create or update vault entries,
  (5) Copy passwords to clipboard,
  (6) Export vault data.
  Requires the `lpass` CLI to be installed and the user to be logged in (`lpass status`).
metadata:
  {
    "openclaw":
      {
        "emoji": "🔑",
        "os": ["darwin", "linux"],
        "requires": { "bins": ["lpass"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "lastpass-cli",
              "bins": ["lpass"],
              "label": "Install LastPass CLI via Homebrew",
            },
          ],
      },
  }
---

# LastPass

Manage the LastPass vault via `lpass` CLI commands.

## Prerequisites

1. `lpass` CLI installed (`brew install lastpass-cli`)
2. User must be logged in — check with `lpass status`
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
lpass show -G "github" --expand-multi --json   # regex search, all matches, JSON
lpass show "exact name" --json    # exact match
```

### Get credentials
```bash
lpass show "Site Name" --password           # password only
lpass show "Site Name" --username           # username only
lpass show "Site Name" --url                # URL only
lpass show "Site Name" --notes              # secure notes
lpass show "Site Name" --field="TOTP"       # custom field (e.g. TOTP seed)
lpass show "Site Name" --clip               # copy password to clipboard
lpass show "Site Name" --json               # full entry as JSON
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
lpass export --fields=name,username,password,url,grouping
```

## Security Rules

- NEVER display raw passwords in chat messages unless the user explicitly asks
- Prefer `--clip` to copy to clipboard instead of printing passwords
- When showing entries, default to `--username` or `--json` (which masks passwords in some contexts)
- Never export the full vault without explicit user confirmation

## Reference

For full CLI options and format strings, see [lpass-reference.md](references/lpass-reference.md).
