# lastpass

This skill lets Claude search, read, generate, create, update, move, and export entries in your LastPass vault through the LastPass CLI, `lpass`.

The skill keeps passwords out of the conversation. Claude copies a password to the clipboard instead of printing it, and asks for one field at a time when it shows an entry. It exports the vault only after you confirm.

## Before you begin

To use the skill, you need the following:

- A LastPass account.
- `lastpass-cli`, which provides `lpass`. On macOS, install it with `brew install lastpass-cli`.

## Install the skill

To install the skill for Claude Code, follow these steps:

1. Clone the repository and link the skill into your skills folder:

   ```bash
   git clone https://github.com/hcastro/agent-artifacts.git
   mkdir -p ~/.claude/skills
   ln -s "$PWD/agent-artifacts/skills/lastpass" ~/.claude/skills/lastpass
   ```

   The link keeps the skill current when you run `git pull` in the clone. For other install locations, see [Install a skill](../../README.md#install-a-skill).

1. In your own terminal, sign in to LastPass:

   ```bash
   lpass login EMAIL
   ```

   Replace `EMAIL` with your LastPass account email. `lpass` prompts for your master password, so run this command yourself rather than through Claude.

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

- `SKILL.md`: common `lpass` commands and the security rules Claude follows.
- `references/lpass-reference.md`: `lpass` options and format strings.
