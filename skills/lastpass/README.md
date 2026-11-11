# lastpass

This skill lets your agent search, read, generate, create, update, move, and export entries in your LastPass vault through the LastPass CLI, `lpass`.

The skill keeps passwords out of the conversation. The agent copies a password to the clipboard instead of printing it, and asks for one field at a time when it shows an entry. It exports the vault only after you confirm.

## Before you begin

To use the skill, you need the following:

- A LastPass account.
- `lastpass-cli`, which provides `lpass`. On macOS, install it with `brew install lastpass-cli`.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `lastpass`.

Then complete the following setup:

1. In your own terminal, sign in to LastPass:

   ```bash
   lpass login EMAIL
   ```

   Replace `EMAIL` with your LastPass account email. `lpass` prompts for your master password, so run this command yourself rather than through your agent.

1. Check that you're signed in:

   ```bash
   lpass status
   ```

## Use the skill

Ask for what you need from the vault. The following requests trigger the skill:

- "Copy my GitHub password to the clipboard."
- "What's the username on my AWS console entry?"
- "Generate a 24-character password for the new staging database and save it in the Work folder."
- "Move my old router entry to the Archive folder."

## Contents

The skill folder holds the following files:

- `SKILL.md`: common `lpass` commands and the security rules the agent follows.
- `references/lpass-reference.md`: `lpass` options and format strings.
