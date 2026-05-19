# Section guide

What to put in each section, and which sections to skip for which kinds of work. The template ships with the full set; delete sections that don't apply rather than padding them.

## Always include

### Summary
2–4 sentences. What we're building, why, the shape of the solution. The reader should be able to stop here and have the gist.

### Step-by-step
The checklist that drives execution. Each item:
- Names the file(s) touched.
- Gives a one-line outcome ("wires refresh into getSession").
- Includes a scope hint (LOC, "new file", "tests only").
- Is small enough to land in one commit.

If a step needs more than two lines to describe, split it.

## Include when relevant

### Goals & non-goals
Skip for tiny changes (a single bug fix). Include when scope is fuzzy or when the user's request implies adjacent work that you're *not* doing.

### Context
Include when the change touches existing code the reader may not have in their head. Use:
- A file tree showing what's new / modified / deleted.
- 1–3 code excerpts from the current code, with real line numbers.
- Conventions or coupling worth flagging.

Skip for greenfield work.

### Design
Include when the solution has non-trivial structure: a new interface, a new data flow, a state machine, a protocol. A mermaid diagram earns its keep here. Skip for "edit this function" tasks.

### Mockups
Include for any UI change. ASCII is fine for layout sketches; HTML mockups are worth it when typography or color is part of the proposal. Skip for pure backend work.

### File changes
Include diffs for the 2–4 most load-bearing changes — not every change. The goal is to let the reader sanity-check the approach, not to preview the entire patch.

### Risks & decisions
Include when there's a real fork in the road. Each entry should answer:
- What was the choice?
- What did we pick and why?
- What's the failure mode if we're wrong?

A comparison table is good when you considered ≥2 alternatives seriously.

### Testing
Include unless the change is purely cosmetic. Cover:
- Unit (what's the smallest verifiable behavior?)
- Integration (does the system still work end-to-end?)
- Manual (what would *you* click to be convinced?)

### Open questions
Include only when there are real questions for the human. Empty open-questions sections are noise — delete the section if there are none.

## Sizing guidance

A plan for a 1-day task should fit on roughly one screen of scrolling. A plan for a multi-week project may run several screens, but each section should still be scannable. If a section is growing past ~300 words of prose, replace prose with a diagram, table, or code excerpt.

## Tone

This is an engineering doc, not marketing. Avoid:
- "Robust", "seamless", "comprehensive", "leverage".
- Em-dashes for emphasis; use periods or parentheses.
- Bullet lists where a sentence works.
- Restating what the code obviously does.

Prefer:
- Specific file paths and identifiers over generalities.
- Numbers (LOC, latency, row counts) over adjectives.
- Direct verbs ("add", "remove", "split") over hedges ("consider", "potentially").
