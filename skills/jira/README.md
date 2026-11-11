# jira

This skill lets your agent query and update Jira Cloud tickets. It uses the Atlassian CLI (`acli`) for JQL searches, ticket views, status transitions, and assignment. It uses the Jira REST API v3 with Atlassian Document Format (ADF) for rich-text descriptions and comments, story points, and other custom fields.

The agent shows you every write, such as a new ticket, an edit, a transition, or a comment, and waits for your approval before it runs.

## Before you begin

To use the skill, you need the following:

- A Jira Cloud site and an Atlassian API token. To create a token, open the [API tokens page of your Atlassian account](https://id.atlassian.com/manage-profile/security/api-tokens).
- `acli`. On macOS, install it with Homebrew:

  ```bash
  brew tap atlassian/homebrew-acli && brew install acli
  ```

- `curl` and `jq`, for the REST API calls.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `jira`.

Then complete the following setup:

1. Add your Jira settings to your shell profile, such as `~/.zshrc`:

   ```bash
   export JIRA_EMAIL="EMAIL"
   export JIRA_API_TOKEN="API_TOKEN"
   export JIRA_BASE_URL="SITE.atlassian.net"
   ```

   Replace the following:

   - `EMAIL`: your Atlassian account email.
   - `API_TOKEN`: your Atlassian API token.
   - `SITE`: your Jira Cloud site name. Leave out `https://`.

1. Open a new terminal and start a new agent session, so both see the variables.

1. Optional: In a project, say "configure jira." The agent finds your projects, boards, sprints, and custom fields, and writes their IDs to a `.jira-config.json` file in the project root. Later requests read field IDs, such as the story points field, from that file.

## Use the skill

Ask for what you want in plain words. The following requests trigger the skill:

- "Get my tickets in the current sprint."
- "Find open bugs in PROJ assigned to me."
- "Move PROJ-123 to In Review and add a comment with the test steps."
- "Create a ticket for the login timeout with a description that has headings and a code block."
- "Set story points on PROJ-123 to 5."

## Contents

The skill folder holds the following files:

- `SKILL.md`: when to use `acli` or the REST API, the confirmation rule, configuration, and common commands.
- `references/acli-reference.md`: `acli` commands and options.
- `references/jira-rest-api-v3-reference.md`: REST API v3 endpoints and ADF examples.
