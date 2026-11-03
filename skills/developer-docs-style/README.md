# developer-docs-style

This skill makes Claude write, edit, and review developer documentation in the style of the [Google developer documentation style guide](https://developers.google.com/style). It gives Claude the core rules that writers most often miss, a review format, and reference files for voice, structure, punctuation, reference docs, images, and word choice.

Use it for READMEs, guides, tutorials, quickstarts, how-to pages, concept pages, API reference comments, and other technical docs. It isn't meant for marketing copy, UI strings, or fiction.

## Before you begin

The skill needs no setup.

## Install the skill

To install the skill for Claude Code, clone the repository and link the skill into your skills folder:

```bash
git clone https://github.com/hcastro/agent-artifacts.git
mkdir -p ~/.claude/skills
ln -s "$PWD/agent-artifacts/skills/developer-docs-style" ~/.claude/skills/developer-docs-style
```

The link keeps the skill current when you run `git pull` in the clone. For other install locations, see [Install a skill](../../README.md#install-a-skill).

## Use the skill

Your project's style comes first, such as its style guide, its `CLAUDE.md` or `AGENTS.md`, and its established conventions. Your own writing rules also outrank this guide. The skill fills in where they're silent.

The skill has two modes. Claude picks one from your request:

- **Write or revise.** Claude names the doc type and the reader's task, reads the reference files the doc needs, writes or revises it, and checks it against the rules until it passes. When it edits a doc, it keeps every fact, and it asks you when a fact is unclear, such as a date that might be March 4 or April 3. For example: "Rewrite this README in Google developer docs style."
- **Review.** Claude returns one finding per problem, in document order. Each finding gives the line, the text as written, the rule it breaks with a link to that rule's page, and the exact fix. For example: "Review this quickstart for style problems."

## Contents

The skill folder holds the following files:

- `SKILL.md`: the precedence rule, the core rules, the workflow, and the review format.
- `references/voice-and-language.md`: tone, timeless wording, person, voice, tense, global audience, inclusive language, abbreviations, numbers, and units.
- `references/structure-and-formatting.md`: headings, lists, procedures, tables, notices, code, UI elements, links, and dates.
- `references/punctuation.md`: commas, colons, semicolons, dashes, hyphens, parentheses, and quotation marks.
- `references/reference-docs.md`: API reference comments, command syntax and output, placeholders, example values, and file names.
- `references/images.md`: figures, screenshots, alt text, and captions.
- `references/word-list.md`: the word-list entries writers most often get wrong.

Each reference file links to the pages of the Google guide that its rules come from.

## Acknowledgments

The rules in this skill are condensed from the [Google developer documentation style guide](https://developers.google.com/style).
