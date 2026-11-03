---
name: developer-docs-style
description: Writes, edits, and reviews developer documentation in the style of the Google developer documentation style guide, covering voice and tone, timeless wording, headings, procedures, lists, code font, UI text, links, dates, placeholders, punctuation, and accessible images. Use when writing or revising a README, guide, tutorial, quickstart, how-to, concept page, API reference comment, or other technical documentation, when asked to make docs follow Google style or a developer style guide, or when reviewing a doc for style problems. Not for marketing copy, UI strings, or fiction.
---

# Developer docs style

This skill applies the [Google developer documentation style guide](https://developers.google.com/style). The core rules in this document are the ones that matter most and the ones writers most often miss. The reference files hold the rest, grouped by topic, with a source link for each section.

## Precedence

Follow the project's own style first: its style guide, its `CLAUDE.md` or `AGENTS.md`, and its established conventions. Follow the user's writing rules over this guide too. Use this guide where they're silent. The guide itself puts project style first, and calls its rules "guidelines, not rules." When you depart from it, stay consistent through the whole document.

## Core rules

**Voice**
- Write to the reader as *you*, in active voice and present tense. Use the imperative for instructions.
- Be conversational and direct. Leave out *please*, *simply*, *easy*, *just*, *quickly*, exclamation points, and "let's."
- Put the condition or goal before the instruction: "To delete the document, click **Delete**," not "Click **Delete** if you want to delete the document."
- Use *can* for ability, *might* for possibility, and *must* for requirements. Write "We recommend" for advice instead of *should*. Keep *may* for permission and *will* for something that happens later. Avoid *would*.
- Write *after* for *once*, *because* for *since*, *for example* for *e.g.*, and *that is* for *i.e.* Avoid *etc.*

**Timeless wording**
- Document only what exists now. Never pre-announce a feature, including in soft forms such as "is planned" or "coming soon." Write the current fact: "Windows isn't supported."
- Cut *currently*, *now*, *new*, *latest*, *soon*, and *existing*.

**Structure**
- Use sentence case for titles and headings. Start a task heading with a bare verb ("Install the CLI") and a concept heading with a noun ("Installation overview").
- Introduce every list, procedure, table, code sample, and figure with a complete sentence. "To install the CLI, follow these steps:" works. "To install the CLI:" doesn't.
- Write sequential steps as a numbered list, with one action per step and prerequisites before step 1. Mark an optional step or section with `Optional:` at the start.
- Point within a document with *earlier*, *preceding*, *later*, and *following*, never *above* or *below*. Call the document "this document."

**Formatting**
- Put code font on commands, flags, file names, paths, environment variables, API names, values, and output. Bold UI labels, matching their capitalization: "Click **Save**."
- Write placeholders as uppercase with underscores, such as `PROJECT_ID`, and explain each one: "Replace `PROJECT_ID` with your project ID." For several, write "Replace the following:" and list them.
- Use descriptive link text that names the destination. Introduce it with "For more information, see..." Never write "click here" or a bare URL.
- Write dates as "March 4, 2026," never "03/04/2026." Use the serial comma.
- Use example values that can't be real: `example.com`, `192.0.2.1`, and `800-555-0100`.

**Images**
- Never put information only in an image, and never use an image of text or code. Keep text inside a figure to short labels, with no title or sentences.
- Give every image alt text of 155 characters or less, and describe the figure fully in the text.

## Reference files

Read the file for the part of the doc you're working on:

- [references/voice-and-language.md](references/voice-and-language.md): tone, timeless wording, person, voice, tense, global audience, inclusive language, abbreviations, numbers, and units.
- [references/structure-and-formatting.md](references/structure-and-formatting.md): headings, lists, procedures, tables, notices, code, UI elements, links, and dates.
- [references/punctuation.md](references/punctuation.md): commas, colons, semicolons, dashes, hyphens, parentheses, and quotation marks.
- [references/reference-docs.md](references/reference-docs.md): API reference comments, command syntax and output, placeholders, example values, and file names.
- [references/images.md](references/images.md): figures, screenshots, alt text, and captions.
- [references/word-list.md](references/word-list.md): the word-list entries writers most often get wrong.

## Workflow

Copy this checklist and work through it:

```
Docs style:
- [ ] 1. Read the project's style rules and note where they override this guide
- [ ] 2. Name the doc type and the reader's task
- [ ] 3. Read the reference files the doc needs
- [ ] 4. Write or revise the doc
- [ ] 5. Check it against the core rules and the reference files, and fix what fails
```

**Step 2.** A task doc (quickstart, how-to, tutorial) gets a task title and numbered procedures. A concept doc explains with prose, lists, and figures. A reference doc follows the patterns in `references/reference-docs.md`.

**Step 4.** When you edit an existing doc, keep every fact. If a fact can't be stated in this style, such as a date that might be March 4 or April 3, ask the user. Don't guess.

**Step 5.** Check the doc against every core rule, then against the reference files you read. Fix each problem and check again until the doc passes.

## Review a doc

When asked to review rather than rewrite, return one finding per problem, in document order:

```
Line LINE_NUMBER: the text as written
Rule: the rule it breaks, with a descriptive link to its page, such as [Procedures](https://developers.google.com/style/procedures)
Fix: the exact replacement text
```

Group repeated problems, such as code font missing throughout, into one finding with every location. Leave alone what already follows the guide.
