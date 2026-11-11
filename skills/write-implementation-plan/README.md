# write-implementation-plan

This skill writes an implementation plan for a coding task as one HTML file you open in a browser. The plan shows real code excerpts from your repository, a file tree of what changes, before and after diffs, Mermaid diagrams for complex flows, mockups for UI work, the decisions made, and a step-by-step checklist.

Use it after brainstorming or research, when you want to lock in a plan before coding starts. It isn't for READMEs, long-lived design specs, or summaries of finished work.

## Before you begin

The skill needs no setup. The plan page loads fonts, highlight.js 11.9.0, and Mermaid 11.4.1 from CDNs, so it needs a network connection to render fully.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `write-implementation-plan`.

## Use the skill

Ask for a visual or HTML plan once the task is clear. The following requests trigger the skill:

- "Turn what we discussed into an HTML implementation plan."
- "Make me a visual plan for the session refresh change before you start."
- "I want a plan that helps me visualize the migration."

The agent writes the plan to `./plan.html` unless you name another path, and prints the path when it's done. To change the plan, ask for the change, such as "shorter" or "more detail on the API." The agent edits the same file.

## How it works

The agent follows the workflow in [`SKILL.md`](SKILL.md):

1. The agent checks that it knows the task, has read the files involved, and has the decisions made so far. If you start cold, it asks one question.
1. It picks the sections the task needs. Every plan has a summary and a step-by-step checklist.
1. It copies `assets/template.html` and fills each section with real content: excerpts with real paths and line numbers, the real file tree, and the actual proposed diffs. A section without real content gets deleted.
1. It checks the page for leftover template markers and broken table-of-contents links, and fixes what it finds.

## Contents

The skill folder holds the following files:

- `SKILL.md`: the workflow and quality bar.
- `assets/template.html`: the single-file template, with light and dark themes.
- `references/components.md`: HTML snippets for code excerpts, diffs, file trees, mockups, callouts, checklists, and tables.
- `references/sections.md`: which sections to include for which kind of task.
