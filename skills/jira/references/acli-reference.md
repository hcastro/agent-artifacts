# Atlassian CLI (acli) Reference Guide

A comprehensive guide for using the Atlassian Command Line Interface (acli) with Jira Cloud.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Core Concepts](#core-concepts)
- [Querying Data](#querying-data)
  - [Projects](#projects)
  - [Boards](#boards)
  - [Sprints](#sprints)
  - [Work Items (Tickets)](#work-items-tickets)
- [Creating Work Items](#creating-work-items)
- [Editing Work Items](#editing-work-items)
- [Transitioning Work Items](#transitioning-work-items)
- [Assigning Work Items](#assigning-work-items)
- [Comments](#comments)
- [Linking Work Items](#linking-work-items)
- [Filters](#filters)
- [Output Formats](#output-formats)
- [Common Workflows](#common-workflows)
- [JQL Reference](#jql-reference)

---

## Installation

### macOS (Homebrew)

```bash
# Add the Atlassian tap
brew tap atlassian/homebrew-acli

# Install acli
brew install acli

# Verify installation
acli --version
```

### Other Platforms

Download from [Atlassian CLI releases](https://developer.atlassian.com/cloud/acli/) or check the official documentation.

---

## Authentication

### Interactive Web Login (Recommended)

```bash
# Opens browser for OAuth authentication
acli jira auth login
```

This launches a browser window where you authenticate with your Atlassian account.

### API Token Authentication

```bash
# Using stdin for token
echo "YOUR_API_TOKEN" | acli jira auth login \
  --site "yoursite.atlassian.net" \
  --email "your@email.com" \
  --token

# From a file
acli jira auth login \
  --site "yoursite.atlassian.net" \
  --email "your@email.com" \
  --token < token.txt
```

Generate API tokens at: https://id.atlassian.com/manage-profile/security/api-tokens

### Check Authentication Status

```bash
acli jira auth status
```

### Switch Between Accounts

```bash
# List accounts
acli jira auth status

# Switch accounts
acli jira auth switch
```

### Logout

```bash
acli jira auth logout
```

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Work Item** | Generic term for Jira issues (Tasks, Bugs, Stories, Epics, etc.) |
| **Board** | Scrum or Kanban board containing sprints/work items |
| **Sprint** | Time-boxed iteration containing work items |
| **JQL** | Jira Query Language for filtering work items |
| **Filter** | Saved JQL queries with an ID |

---

## Querying Data

### Projects

```bash
# List all projects
acli jira project list --paginate

# List recent projects
acli jira project list --recent

# Limit results
acli jira project list --limit 50

# JSON output
acli jira project list --json
```

### Boards

```bash
# Search all boards
acli jira board search

# Filter by project key
acli jira board search --project PROJ

# Filter by board type
acli jira board search --type scrum
acli jira board search --type kanban

# Filter by name
acli jira board search --name "Team Board"

# Get board details
acli jira board get --id <BOARD_ID>
```

### Sprints

```bash
# List sprints for a board
acli jira board list-sprints --id <BOARD_ID>

# Filter by state
acli jira board list-sprints --id <BOARD_ID> --state active
acli jira board list-sprints --id <BOARD_ID> --state future
acli jira board list-sprints --id <BOARD_ID> --state closed
acli jira board list-sprints --id <BOARD_ID> --state active,closed

# Get all sprints with pagination
acli jira board list-sprints --id <BOARD_ID> --paginate

# Output formats
acli jira board list-sprints --id <BOARD_ID> --json
acli jira board list-sprints --id <BOARD_ID> --csv
```

### Work Items (Tickets)

#### View a Specific Work Item

```bash
# Basic view
acli jira workitem view PROJ-123

# With specific fields
acli jira workitem view PROJ-123 --fields "summary,status,assignee,description"

# All fields
acli jira workitem view PROJ-123 --fields "*all"

# JSON output
acli jira workitem view PROJ-123 --json

# Open in browser
acli jira workitem view PROJ-123 --web
```

#### List Work Items in a Sprint

```bash
# Basic listing
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID>

# With custom fields
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID> \
  --fields "key,summary,status,assignee,priority"

# Filter with JQL
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID> \
  --jql "assignee = currentUser()"

# Pagination for large sprints
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID> --paginate

# Output formats
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID> --json
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID> --csv
```

#### Search Work Items with JQL

```bash
# Basic search
acli jira workitem search --jql "project = PROJ"

# Search with assignee
acli jira workitem search --jql "project = PROJ AND assignee = currentUser()"

# Search by status
acli jira workitem search --jql "project = PROJ AND status = 'In Progress'"

# Count results
acli jira workitem search --jql "project = PROJ" --count

# Custom fields
acli jira workitem search --jql "project = PROJ" \
  --fields "key,summary,assignee,status"

# Pagination for all results
acli jira workitem search --jql "project = PROJ" --paginate

# Limit results
acli jira workitem search --jql "project = PROJ" --limit 100

# Open in browser
acli jira workitem search --jql "project = PROJ" --web

# Use a saved filter
acli jira workitem search --filter 10001
```

---

## Creating Work Items

### Basic Creation

```bash
# Minimal task
acli jira workitem create \
  --project PROJ \
  --type Task \
  --summary "Implement new feature"

# With description
acli jira workitem create \
  --project PROJ \
  --type Task \
  --summary "Implement new feature" \
  --description "Detailed description of the task"

# Self-assign
acli jira workitem create \
  --project PROJ \
  --type Task \
  --summary "My new task" \
  --assignee @me

# Assign to someone else
acli jira workitem create \
  --project PROJ \
  --type Task \
  --summary "Task for colleague" \
  --assignee "colleague@company.com"

# With labels
acli jira workitem create \
  --project PROJ \
  --type Bug \
  --summary "Fix login issue" \
  --label "bug,urgent,auth"

# Create sub-task (with parent)
acli jira workitem create \
  --project PROJ \
  --type Sub-task \
  --summary "Sub-task title" \
  --parent PROJ-100
```

### Work Item Types

Common types (varies by project configuration):
- `Task`
- `Bug`
- `Story`
- `Epic`
- `Spike`
- `Sub-task`

### Using Editor

```bash
# Opens default text editor for summary and description
acli jira workitem create --project PROJ --type Task --editor
```

### From File

```bash
# First line = summary, rest = description
acli jira workitem create \
  --project PROJ \
  --type Task \
  --from-file ticket.txt
```

### From JSON (Complex Tickets)

```bash
# Generate template
acli jira workitem create --generate-json > workitem.json

# Edit the JSON file, then create
acli jira workitem create --from-json workitem.json
```

### Description from File

```bash
acli jira workitem create \
  --project PROJ \
  --type Task \
  --summary "Task with long description" \
  --description-file description.txt
```

---

## Editing Work Items

### Edit by Key

```bash
# Edit summary
acli jira workitem edit --key PROJ-123 --summary "Updated summary"

# Edit description
acli jira workitem edit --key PROJ-123 --description "New description"

# Edit multiple fields
acli jira workitem edit --key PROJ-123 \
  --summary "Updated summary" \
  --description "Updated description"

# Edit multiple work items
acli jira workitem edit --key "PROJ-123,PROJ-124" --summary "Bulk update"

# Change type
acli jira workitem edit --key PROJ-123 --type Bug

# Edit labels
acli jira workitem edit --key PROJ-123 --labels "new-label,another-label"

# Remove labels
acli jira workitem edit --key PROJ-123 --remove-labels "old-label"
```

### Bulk Edit with JQL

```bash
# Edit all matching work items
acli jira workitem edit \
  --jql "project = PROJ AND status = 'To Do'" \
  --assignee "user@company.com" \
  --yes

# Using filter
acli jira workitem edit --filter 10001 --description "Updated" --yes
```

### Edit from JSON

```bash
# Generate template
acli jira workitem edit --generate-json > edit-template.json

# Apply edits
acli jira workitem edit --from-json edit-template.json
```

---

## Transitioning Work Items

Move work items between statuses.

```bash
# Transition single item
acli jira workitem transition --key PROJ-123 --status "In Progress"

# Common status values (varies by project workflow)
acli jira workitem transition --key PROJ-123 --status "To Do"
acli jira workitem transition --key PROJ-123 --status "In Progress"
acli jira workitem transition --key PROJ-123 --status "Done"

# Transition multiple items
acli jira workitem transition --key "PROJ-123,PROJ-124" --status "Done"

# Bulk transition with JQL
acli jira workitem transition \
  --jql "project = PROJ AND assignee = currentUser() AND status = 'To Do'" \
  --status "In Progress" \
  --yes

# Skip confirmation
acli jira workitem transition --key PROJ-123 --status "Done" --yes
```

---

## Assigning Work Items

```bash
# Self-assign
acli jira workitem assign --key PROJ-123 --assignee @me

# Assign to user
acli jira workitem assign --key PROJ-123 --assignee "user@company.com"

# Assign to default project assignee
acli jira workitem assign --key PROJ-123 --assignee default

# Remove assignee
acli jira workitem assign --key PROJ-123 --remove-assignee

# Bulk assign with JQL
acli jira workitem assign \
  --jql "project = PROJ AND status = 'To Do'" \
  --assignee "user@company.com" \
  --yes

# Assign from file (list of keys)
acli jira workitem assign --from-file issues.txt --assignee @me
```

---

## Comments

### Add Comment

```bash
# Inline comment
acli jira workitem comment create --key PROJ-123 --body "This is my comment"

# Comment from file
acli jira workitem comment create --key PROJ-123 --body-file comment.txt

# Using editor
acli jira workitem comment create --key PROJ-123 --editor

# Comment on multiple items
acli jira workitem comment create \
  --jql "project = PROJ AND status = 'In Progress'" \
  --body "Status update: On track"

# Edit last comment
acli jira workitem comment create --key PROJ-123 --body "Updated comment" --edit-last
```

### List Comments

```bash
acli jira workitem comment list --key PROJ-123
```

### Update Comment

```bash
acli jira workitem comment update --key PROJ-123 --comment-id 12345 --body "Updated text"
```

### Delete Comment

```bash
acli jira workitem comment delete --key PROJ-123 --comment-id 12345
```

---

## Linking Work Items

### List Link Types

```bash
acli jira workitem link type
```

### Create Link

```bash
# Basic link
acli jira workitem link create --out PROJ-123 --in PROJ-124 --type Blocks

# Common link types:
# - Blocks / is blocked by
# - Clones / is cloned by
# - Duplicates / is duplicated by
# - Relates to

# From JSON
acli jira workitem link create --from-json links.json

# From CSV
acli jira workitem link create --from-csv links.csv
```

### List Links

```bash
acli jira workitem link list --key PROJ-123
```

### Delete Link

```bash
acli jira workitem link delete --key PROJ-123 --link-id 12345
```

---

## Filters

### List Filters

```bash
# My filters
acli jira filter list

# Search filters
acli jira filter search --name "Sprint"
```

### Get Filter Details

```bash
acli jira filter get --id 10001
```

### Use Filter in Search

```bash
acli jira workitem search --filter 10001
```

---

## Attachments

### List Attachments

```bash
acli jira workitem attachment list --key PROJ-123
```

### Delete Attachment

```bash
acli jira workitem attachment delete --key PROJ-123 --attachment-id 12345
```

---

## Deleting Work Items

```bash
# Delete single item
acli jira workitem delete --key PROJ-123

# Delete multiple items
acli jira workitem delete --key "PROJ-123,PROJ-124"

# Delete with JQL (dangerous!)
acli jira workitem delete --jql "project = PROJ AND status = Abandoned" --yes

# Delete from file
acli jira workitem delete --from-file issues-to-delete.txt --yes
```

---

## Output Formats

Most commands support multiple output formats:

```bash
# Default table format
acli jira workitem search --jql "project = PROJ"

# JSON (for programmatic use)
acli jira workitem search --jql "project = PROJ" --json

# CSV (for spreadsheets)
acli jira workitem search --jql "project = PROJ" --csv
```

---

## Common Workflows

### Get My Current Sprint Tickets

```bash
# Step 1: Find your board (or read from .jira-config.json)
acli jira board search --project PROJ

# Step 2: Get active sprint
acli jira board list-sprints --id <BOARD_ID> --state active

# Step 3: List sprint work items
acli jira sprint list-workitems --board <BOARD_ID> --sprint <SPRINT_ID>
```

### Quick Daily Standup View

```bash
# My in-progress items
acli jira workitem search \
  --jql "assignee = currentUser() AND status = 'In Progress'" \
  --fields "key,summary,status"
```

### Create and Start Working on Task

```bash
# Create task and self-assign
acli jira workitem create \
  --project PROJ \
  --type Task \
  --summary "New feature implementation" \
  --assignee @me

# Move to In Progress (use the returned key)
acli jira workitem transition --key PROJ-XXXX --status "In Progress"
```

### Complete a Task

```bash
# Add completion comment
acli jira workitem comment create --key PROJ-123 --body "Implementation complete, ready for review"

# Move to review/done
acli jira workitem transition --key PROJ-123 --status "Done"
```

### Bulk Status Update

```bash
# Move all my "To Do" items to "In Progress"
acli jira workitem transition \
  --jql "project = PROJ AND assignee = currentUser() AND status = 'To Do'" \
  --status "In Progress" \
  --yes
```

---

## JQL Reference

### Common Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `status = "Done"` |
| `!=` | Not equals | `status != "Done"` |
| `IN` | In list | `status IN ("To Do", "In Progress")` |
| `NOT IN` | Not in list | `status NOT IN ("Done", "Abandoned")` |
| `~` | Contains text | `summary ~ "bug"` |
| `IS EMPTY` | Field is empty | `assignee IS EMPTY` |
| `IS NOT EMPTY` | Field has value | `assignee IS NOT EMPTY` |

### Common Functions

| Function | Description | Example |
|----------|-------------|---------|
| `currentUser()` | Logged-in user | `assignee = currentUser()` |
| `now()` | Current time | `created > now(-7d)` |
| `startOfDay()` | Start of today | `created >= startOfDay()` |
| `startOfWeek()` | Start of week | `updated >= startOfWeek()` |

### Example Queries

```bash
# My open tickets
"assignee = currentUser() AND status != Done"

# High priority bugs
"project = PROJ AND type = Bug AND priority = High"

# Created in last 7 days
"project = PROJ AND created >= -7d"

# Updated today
"project = PROJ AND updated >= startOfDay()"

# Unassigned tickets
"project = PROJ AND assignee IS EMPTY"

# Text search in summary
"project = PROJ AND summary ~ 'authentication'"

# Specific labels
"project = PROJ AND labels = 'urgent'"

# Ordered results
"project = PROJ ORDER BY priority DESC, created ASC"
```

---

## Tips and Best Practices

1. **Use `--json` for scripting**: When integrating with other tools, JSON output is easier to parse
2. **Use `--paginate` for large datasets**: Ensures you get all results, not just the first page
3. **Use `--yes` cautiously**: Skips confirmation for bulk operations
4. **Save common JQL as filters**: Use saved filters (`--filter`) instead of retyping JQL
5. **Use `@me` for self-assignment**: Cleaner than typing your email
6. **Check auth status regularly**: `acli jira auth status` helps debug issues
7. **Use `.jira-config.json`**: Store board/sprint IDs in config instead of memorizing them

---

## Troubleshooting

### Authentication Issues

```bash
# Check status
acli jira auth status

# Re-authenticate
acli jira auth logout
acli jira auth login
```

### JQL Errors

If you get JQL parsing errors:
- Wrap field values with spaces in quotes: `status = "In Progress"`
- Check field names match your Jira configuration
- Some JQL functions may not be available via CLI

### Permission Errors

- Ensure your account has appropriate project permissions
- Some operations require admin rights

---

## Additional Resources

- [Atlassian CLI Documentation](https://developer.atlassian.com/cloud/acli/)
- [JQL Reference](https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
- [Atlassian Community](https://community.atlassian.com/)
