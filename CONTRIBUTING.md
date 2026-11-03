# Contributing

This repository holds personal agent skills. Issues and pull requests are welcome. The sections in this document explain the conventions every skill follows.

## Skill layout

Each skill is a folder under `skills/` whose name matches the `name` field in its `SKILL.md` file. The following tree shows the parts a skill can have:

```
skills/SKILL_NAME/
├── SKILL.md       # Required. Frontmatter and instructions for the agent.
├── README.md      # Required. Overview, setup, and usage for people.
├── scripts/       # Optional. Code the agent runs.
├── references/    # Optional. Detail the agent reads when SKILL.md points to it.
├── assets/        # Optional. Templates and files used in output.
└── evals/         # Optional. Test prompts and expected behavior.
```

Create only the folders the skill uses.

## Name a skill

Pick a name that follows these rules:

- A skill that does a job starts with a verb, such as `read-long-screenshot` or `review-pr`.
- A reference skill is named by its topic, such as `swift-concurrency`. Don't add `-guide`, `-expert`, or `-best-practices`.
- Don't start with a gerund.
- Use three words or fewer, in lowercase letters, digits, and hyphens.
- Don't add a team or brand prefix, or the words `anthropic` or `claude`.
- Give skills in one family the same shape.

These rules apply to new skills. Some older skill names predate them.

## Write SKILL.md

The frontmatter has two fields, `name` and `description`:

```yaml
---
name: SKILL_NAME
description: Does X for Y. Use when the user asks to A or B, or shares C.
---
```

`name` is at most 64 characters and matches the folder name. `description` is at most 1,024 characters, written in third person, with no XML tags. It says what the skill does and when to use it, in the words a user would type. All guidance about when to use the skill goes in the description, because the agent reads only the description before it loads the skill.

For the body, follow these rules:

- Keep `SKILL.md` under 500 lines. Move detail into `references/`, link each file from `SKILL.md`, and say when to read it.
- Keep references one level deep. Start a reference file longer than 100 lines with a table of contents.
- Leave out what the agent already knows.
- Give a multistep workflow a checklist the agent can copy. Give a quality-critical step a loop: validate, fix, and validate again.
- Say whether the agent runs a script or reads it. A script handles its own errors and explains its constants. List its dependencies in `SKILL.md`.
- Use forward slashes in paths and fully qualified MCP tool names, such as `ServerName:tool_name`.
- Keep setup and install notes in the skill's `README.md`, not in extra files such as a changelog.

For more information, see [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Write the skill README

Each skill's `README.md` is for people browsing the repository. It covers what the skill does, what it needs, how to install it, and an example request that triggers it. Follow the [Google developer documentation style guide](https://developers.google.com/style).

## Check a skill

Before you open a pull request, follow these steps:

1. Validate the frontmatter:

   ```bash
   uv run --with pyyaml python SKILL_CREATOR_DIR/scripts/quick_validate.py skills/SKILL_NAME
   ```

   Replace `SKILL_CREATOR_DIR` with the path to a copy of the [skill-creator skill](https://github.com/anthropics/skills/tree/main/skills/skill-creator). The validator also accepts `license`, `allowed-tools`, and `metadata`, but skills in this repository use only `name` and `description`.

2. Install the skill and try it on a few real requests, including one that must not trigger it.
3. Add the skill's row to the table in the root `README.md`.

## Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/). For example:

- `feat(skills): add read-long-screenshot skill`
- `feat(jira): add generalized Jira Cloud skill with auto-configuration`
- `fix(evernote): match h1-h3 headings in section append/prepend`
- `docs(readme): list implementation-plan-html skill`

## Security

Never commit API tokens, keys, passwords, or personal credentials. Skills read secrets from environment variables. Don't commit local settings such as `.claude/settings.local.json`, or employer-internal names, URLs, and data.
