---
name: jira
description: Queries and updates Jira Cloud tickets with the Atlassian CLI (acli) and the Jira REST API v3. Uses acli for JQL searches, ticket views, transitions, and assignment, and REST API v3 with Atlassian Document Format (ADF) for rich-text descriptions and comments, story points, and other custom fields. Use when the user asks to get sprint tickets, search Jira with JQL, create, edit, transition, assign, or comment on a Jira ticket, update story points, add a rich-text comment, or configure Jira for a project.
---

# Jira Skill

Interact with Jira Cloud using either the `acli` command-line tool or the REST API v3 directly.

## When to Use REST API vs acli

| Use Case | Tool | Why |
|----------|------|-----|
| **Creating tickets with rich text** | REST API v3 | Full ADF support for headings, lists, code blocks, panels |
| **Adding comments with formatting** | REST API v3 | ADF formatting for structured comments |
| **Updating custom fields** | REST API v3 | Full control over field values (story points, acceptance criteria, etc.) |
| **Quick searches/queries** | acli | Simpler syntax, good for JQL queries |
| **Status transitions** | acli | Simple one-liner commands |
| **Viewing tickets** | acli | Quick `--json` output for parsing |
| **Bulk operations** | acli | Built-in pagination and batch support |

**Rule of thumb:** Use REST API for *creating/updating content* (rich text), use acli for *reading/querying* operations.

## Confirm before writing

Jira is shared with the user's team. Before you create, edit, transition, assign, comment on or delete a ticket, show the user the exact change (ticket key, fields, body) and wait for approval, unless they already approved that exact content. Never run a bulk `--jql` or `--filter` write, a delete, or any command with `--yes` without explicit approval for that command.

---

## Configuration

This skill supports a project-level configuration file (`.jira-config.json`) that stores your Jira instance's custom field IDs, board IDs, sprint IDs, and project defaults. This eliminates the need to hardcode org-specific values.

### Configuration File Location

The skill looks for `.jira-config.json` in the project root (next to `package.json` or `.git/`).

### Running Configuration

When the user says "configure jira", "set up jira", or when configuration is missing, run the interactive configuration flow:

1. **Verify environment variables** are set (see [Prerequisites](#prerequisites))
2. **Discover projects** the user has access to
3. **Discover boards and sprints** for the selected project
4. **Discover custom fields** and let the user identify which ones matter (story points, acceptance criteria, etc.)
5. **Write `.jira-config.json`** to the project root

### Configuration Discovery Script

Run the discovery commands in sequence and present results to the user:

```bash
# Step 1: List accessible projects
acli jira project list --json | head -50

# Step 2: After user picks a project, find boards
acli jira board search --project <PROJECT_KEY> --json

# Step 3: After user picks a board, find sprints
acli jira board list-sprints --id <BOARD_ID> --state active,future --json

# Step 4: Discover custom fields via REST API
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Accept: application/json" \
  "https://$JIRA_BASE_URL/rest/api/3/field" | jq '[.[] | select(.custom == true) | {name, id, schema: .schema.type}]'
```

Present the custom fields to the user and ask which ones they want to map. Common fields to look for:

- **Story Points** — often `customfield_XXXXX` with type `number`
- **Sprint** — often `customfield_10020` with type `array`
- **Acceptance Criteria** — often a custom rich text field
- **Epic Link** — often `customfield_10014`
- **Team** — varies by instance

### Configuration File Format

```json
{
  "instance": {
    "baseUrl": "yoursite.atlassian.net"
  },
  "project": {
    "key": "PROJ",
    "name": "My Project"
  },
  "board": {
    "id": 1234,
    "name": "PROJ Board"
  },
  "sprints": {
    "backlog": { "id": null, "name": "Backlog" },
    "active": { "id": null, "name": null }
  },
  "fields": {
    "storyPoints": { "id": "customfield_XXXXX", "name": "Story Points" },
    "sprint": { "id": "customfield_10020", "name": "Sprint" },
    "acceptanceCriteria": { "id": "customfield_XXXXX", "name": "Acceptance Criteria" }
  },
  "issueTypes": ["Task", "Bug", "Story", "Epic", "Spike", "Sub-task"],
  "statuses": ["To Do", "In Progress", "In Review", "Done"]
}
```

### Using Configuration

When performing operations that need custom field IDs, board IDs, or sprint IDs:

1. **Read `.jira-config.json`** from the project root
2. **Use the mapped field IDs** instead of hardcoded values
3. **If config is missing**, prompt the user to run configuration first

Example — updating story points using config:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" \
  -X PUT "https://$JIRA_BASE_URL/rest/api/3/issue/<KEY>" \
  -d '{"fields": {"<fields.storyPoints.id from .jira-config.json>": 5}}'
```

---

## Prerequisites

### 1. Install acli

```bash
# macOS (Homebrew)
brew tap atlassian/homebrew-acli
brew install acli

# Verify installation
acli --version
```

### 2. Set Required Environment Variables

Add these to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
export JIRA_API_TOKEN="your-api-token"         # Generate at https://id.atlassian.com/manage-profile/security/api-tokens
export JIRA_BASE_URL="yoursite.atlassian.net"   # Your Jira Cloud instance (without https://)
export JIRA_EMAIL="your@email.com"              # Your Atlassian account email
```

After adding, reload your shell config:
```bash
source ~/.zshrc  # or ~/.bashrc for bash
```

## Agent Authentication Protocol

When this skill is invoked and the agent needs to authenticate against the Atlassian CLI:

1. **Check environment variables are set**:
   ```bash
   echo "JIRA_API_TOKEN: ${JIRA_API_TOKEN:+set}"
   echo "JIRA_BASE_URL: ${JIRA_BASE_URL:+set}"
   echo "JIRA_EMAIL: ${JIRA_EMAIL:+set}"
   ```

2. **If any variable is missing**, ask the user to export it in their shell profile and restart the session. Don't `source` an rc file to fix it: shell state doesn't carry from one command to the next, so a later command won't see the variables.

3. **Authenticate** using the token-based login:
   ```bash
   echo $JIRA_API_TOKEN | acli jira auth login --site $JIRA_BASE_URL --email $JIRA_EMAIL --token
   ```

4. **Verify** authentication succeeded:
   ```bash
   acli jira auth status
   ```

---

## REST API v3 (Rich Text Operations)

For creating tickets or comments with rich text formatting (headings, lists, code blocks, links, panels), use the Jira REST API v3 with Atlassian Document Format (ADF).

### Create Ticket with Rich Text

Save the fields as `payload.json`:

```json
{
  "fields": {
    "project": { "key": "PROJ" },
    "issuetype": { "name": "Task" },
    "summary": "Ticket title",
    "description": {
      "version": 1,
      "type": "doc",
      "content": [
        {
          "type": "heading",
          "attrs": { "level": 3 },
          "content": [{ "type": "text", "text": "Overview" }]
        },
        {
          "type": "bulletList",
          "content": [
            { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Item 1" }] }] },
            { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Item 2" }] }] }
          ]
        }
      ]
    },
    "priority": { "name": "High" }
  }
}
```

Then create the ticket:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" \
  -X POST "https://$JIRA_BASE_URL/rest/api/3/issue" -d @payload.json
```

### Add Comment with Rich Text

Save the comment body as `comment.json`:

```json
{
  "body": {
    "version": 1,
    "type": "doc",
    "content": [
      {
        "type": "panel",
        "attrs": { "panelType": "success" },
        "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Fix verified!" }] }]
      }
    ]
  }
}
```

Then post it:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" \
  -X POST "https://$JIRA_BASE_URL/rest/api/3/issue/<KEY>/comment" -d @comment.json
```

For complete ADF documentation including all node types, marks, and examples, see [references/jira-rest-api-v3-reference.md](references/jira-rest-api-v3-reference.md).

To move an issue to a sprint or discover custom field IDs, see the curl Examples and Field Discovery sections of [references/jira-rest-api-v3-reference.md](references/jira-rest-api-v3-reference.md).

---

## acli Quick Reference

### Get Current Sprint Tickets

```bash
# Read board ID from config, or discover it:
# 1. Find board ID
acli jira board search --project <PROJECT_KEY>

# 2. Get active sprint
acli jira board list-sprints --id <BOARD_ID> --state active

# 3. List sprint tickets
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID> --paginate
```

### View a Ticket

```bash
acli jira workitem view <KEY> --json
```

### Create a Ticket

```bash
acli jira workitem create \
  --project <PROJECT_KEY> \
  --type Task \
  --summary "Title" \
  --description "Details" \
  --assignee @me
```

Types: `Task`, `Bug`, `Story`, `Epic`, `Spike`, `Sub-task` (varies by project — check your config)

### Edit a Ticket

```bash
acli jira workitem edit --key <KEY> --summary "New title"
acli jira workitem edit --key <KEY> --description "New description"
```

### Transition Status

```bash
acli jira workitem transition --key <KEY> --status "In Progress"
```

### Assign a Ticket

```bash
acli jira workitem assign --key <KEY> --assignee @me
acli jira workitem assign --key <KEY> --assignee "email@company.com"
```

### Add Comment

```bash
acli jira workitem comment create --key <KEY> --body "Comment text"
```

### Search with JQL

```bash
acli jira workitem search --jql "project = <PROJECT_KEY> AND assignee = currentUser()"
acli jira workitem search --jql "project = <PROJECT_KEY> AND status = 'In Progress'"
```

## Output Formats

Add `--json` for JSON output (useful for parsing), `--csv` for spreadsheet export.

## Detailed References

### acli Reference

For comprehensive acli command documentation including all command flags and options, bulk operations, linking tickets, attachments, filters, and JQL syntax, see [references/acli-reference.md](references/acli-reference.md).

### REST API v3 Reference

For REST API documentation including authentication setup, ADF structure, all block nodes, inline nodes, marks, TypeScript implementation examples, curl examples, and error handling, see [references/jira-rest-api-v3-reference.md](references/jira-rest-api-v3-reference.md).

---

## ADF Formatting Principles

ADF (Atlassian Document Format) uses structured nodes and marks for formatting — not markdown syntax. When generating ADF content:

### Core Principle

**If text would be formatted in markdown, apply the equivalent ADF mark instead of embedding markdown syntax as literal text.**

| Markdown | ADF Equivalent |
|----------|----------------|
| `` `code` `` | `marks: [{ type: "code" }]` |
| `**bold**` | `marks: [{ type: "strong" }]` |
| `*italic*` | `marks: [{ type: "em" }]` |
| `[link](url)` | `marks: [{ type: "link", attrs: { href: "url" } }]` |

### Common Mistake

```typescript
// Wrong: markdown syntax embedded as text (renders as literal backticks)
{ type: "text", text: "Upgrade to `lodash@4.17.23`" }

// Correct: proper ADF marks (renders as formatted code)
[
  { type: "text", text: "Upgrade to " },
  { type: "text", text: "lodash@4.17.23", marks: [{ type: "code" }] }
]
```

### Guideline

Apply `code` marks to any text that represents something technical: package names, versions, function names, CLI flags, config keys, identifiers, etc. If you'd use backticks in markdown or a monospace font in documentation, use the `code` mark in ADF.
