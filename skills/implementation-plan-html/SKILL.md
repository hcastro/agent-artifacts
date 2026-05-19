---
name: implementation-plan-html
description: Generate a single-file, self-contained HTML implementation plan that visualizes a coding plan with real code excerpts, file trees, mockups, mermaid diagrams, before/after diffs, decisions, and a step-by-step checklist. Use after brainstorming or research, when the user wants to "lock in" a plan, asks for a "visual plan", "HTML plan", "implementation plan as HTML", "plan that helps me visualize", or wants maximum context before implementation begins. Not for general docs, READMEs, or design specs — this is specifically for capturing the about-to-be-executed plan for a coding task.
---

# Implementation Plan HTML

## Overview

Produce one polished `.html` file the user can open in a browser to see the whole plan at a glance: real code excerpts from the actual repo, a file tree of what changes, mockups for UI work, mermaid diagrams for non-trivial flows, diffs for the load-bearing changes, and a checklist that drives execution.

The output is a single self-contained file — no build step, no local assets beyond CDN script tags. The user double-clicks it.

## Presentation matters

This skill exists because the user wants something beautiful, not just structured. The template ships with an editorial design system: Fraunces (variable serif) for display, Inter for body, JetBrains Mono for code, warm paper light theme, rich warm dark theme, generous spacing, italic display accents, decimal-leading-zero section numbering, TOC scroll-spy.

**Do not strip the styling.** Do not replace the fonts. Do not collapse the whitespace. Do not swap the palette for something more "developer-y." If you regenerate the HTML from scratch, you will produce something worse — copy the template and edit the content inside it.

When in doubt about a styling choice (a new component, a layout variation), match the existing pattern in [`references/components.md`](references/components.md) rather than inventing.

## When this triggers

Strong triggers (just do it):
- "create an HTML file as a plan that helps me visualize…"
- "make a visual implementation plan"
- "lock the brainstorm into a plan"
- "give me maximum context before I implement"
- Any request that names HTML + plan + a coding task.

Do not use this skill for:
- READMEs, contributor docs, or user-facing documentation.
- Design specs intended to live in the repo long-term.
- Post-hoc summaries of work already done (use a PR description instead).

## Workflow

### 1. Confirm you have enough specifics

A good plan needs concrete inputs. Before generating, make sure you have:
- The task (what the user is trying to build/change).
- The relevant files in the repo. If you haven't read them yet, read them now — code excerpts must be real, with correct paths and line numbers.
- Any decisions already made in the conversation (architecture, library choice, naming).

If the user invokes this skill cold with no prior brainstorm, ask one focused question to nail the task, then proceed. Do not run a full requirements interview.

### 2. Decide which sections apply

The template has ten sections. Most plans don't need all ten. Read [`references/sections.md`](references/sections.md) for which to include and which to delete based on the task type (UI vs. backend, greenfield vs. edit, tiny fix vs. multi-week project).

Default: keep Summary and Step-by-step. Add others as the work warrants.

### 3. Copy the template and fill it in

Start from [`assets/template.html`](assets/template.html). Copy it to the target location and edit in place. Do not re-derive the CSS — the template's classes are the contract that all snippets in `references/components.md` rely on.

Default output path: `./plan.html` in the current working directory. If the user specified a path, use that. If a `plan.html` already exists, suggest a name like `plan-<short-slug>.html`.

### 4. Use real content, not placeholders

The template ships with example content (`session.ts`, refresh logic). **Replace all of it.** Concretely:
- All `{{LIKE_THIS}}` markers must be filled in or removed.
- Every code excerpt must be from a real file you actually read. Include the real path and real line range — read the file to get accurate line numbers.
- The file tree must reflect actual paths in this repo.
- Diff blocks must show the actual proposed change, not a toy edit.
- Mermaid diagrams must reflect the real flow, not the template's example.
- Mockups should reflect the actual UI surface being changed.

If you don't have the real content for a section, delete the section rather than ship a placeholder.

### 5. Build sections with the component snippets

[`references/components.md`](references/components.md) has copy-paste HTML fragments for every visual element: code excerpts, diffs, file trees, mockups, callouts, checklists, comparison tables, badges. Use those exact class names — they're already styled by the template.

Rules that bite if ignored:
- Inside `<code>` blocks, escape `<` as `&lt;` and `&` as `&amp;`.
- Diff lines must be wrapped in `<span class="hl-add">` / `<span class="hl-del">` to get the full-row background tint.
- File-tree containers are `white-space: pre`; use real box-drawing characters and align with spaces.
- Use `language-*` classes hljs recognizes (`language-typescript`, `language-python`, `language-tsx`, `language-rust`, `language-go`, `language-bash`, `language-json`, `language-sql`, `language-diff`).

### 6. Tell the user where it landed

After writing the file, output the absolute path and a one-line "open with: `open <path>`" hint (macOS) or equivalent. Do not try to open it yourself.

## Quality bar

Before reporting done, scan the output for:
- Any remaining `{{PLACEHOLDER}}` text → fill or delete.
- Any code excerpt without a real path + line range → fix or remove.
- Any section that is shorter than the section heading suggests → cut the section.
- Hero summary that says nothing ("This plan describes the implementation") → rewrite to state the actual thing being built.

If the user follows up with "shorter" or "more detail on X", edit the same file rather than regenerating from scratch.

## Resources

- [`assets/template.html`](assets/template.html) — the single-file template. Copy and edit in place.
- [`references/components.md`](references/components.md) — HTML snippets for every visual element. Read when assembling sections.
- [`references/sections.md`](references/sections.md) — which sections to include for which task type. Read before deleting/keeping sections.
