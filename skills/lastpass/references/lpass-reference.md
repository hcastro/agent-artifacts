# lpass CLI Reference

## Commands

### Status & Auth
- `lpass status` — Check login status
- `lpass login USERNAME` — Login (interactive, needs TTY)
- `lpass logout --force` — Logout
- `lpass sync` — Force sync with LastPass servers

### Viewing
- `lpass ls` — List all entries in tree structure
- `lpass ls GROUP` — List entries in a specific group/folder
- `lpass ls --long` — List with modification times
- `lpass show NAME` — Show entry (prompts if multiple matches)
- `lpass show NAME --json` — Show as JSON
- `lpass show NAME --password` — Show only password
- `lpass show NAME --username` — Show only username
- `lpass show NAME --url` — Show only URL
- `lpass show NAME --notes` — Show only notes
- `lpass show NAME --field=FIELD` — Show custom field
- `lpass show NAME --clip` — Copy password to clipboard
- `lpass show NAME -G` — Regex match (case-insensitive)
- `lpass show NAME -F` — Substring match
- `lpass show NAME --expand-multi` — Show all matches (not just first)

### Modifying
- `lpass generate NAME LENGTH` — Generate password for new/existing entry
- `lpass generate NAME LENGTH --no-symbols` — Generate without symbols
- `lpass generate NAME LENGTH --username=USER --url=URL` — Generate with metadata
- `echo "password" | lpass add --non-interactive --password NAME` — Set password non-interactively
- `echo "content" | lpass edit --non-interactive --notes NAME` — Edit notes non-interactively
- `lpass rm NAME` — Delete entry
- `lpass mv NAME GROUP` — Move entry to group
- `lpass duplicate NAME` — Duplicate entry

### Data
- `lpass export` — Export all entries as CSV
- `lpass export --fields=name,username,password,url,grouping` — Export specific fields

### Format strings (for show/ls)
- `%ai` — Account ID
- `%an` — Account name
- `%aN` — Full name with path
- `%au` — Username
- `%ap` — Password
- `%al` — URL
- `%ag` — Group name
- `%am` — Modification time

### Environment Variables
- `LPASS_AGENT_TIMEOUT` — Agent timeout in seconds (0 = never expire)
- `LPASS_DISABLE_PINENTRY=1` — Use stdin for password input
- `LPASS_AUTO_SYNC_TIME` — Seconds before cache refresh (default: 5)
