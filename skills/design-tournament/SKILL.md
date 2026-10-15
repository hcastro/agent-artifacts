---
name: design-tournament
description: Run a multi-round design tournament for visual and frontend work (logos and marks, UI screens and components, pages, themes and design systems, data visualization) where divergent aesthetic directions are built by designer agents, rendered at real sizes, judged blind by lens judges against a written rubric, tallied in code, and narrowed round by round with the owner's taste at checkpoints. Use when the user asks for a design tournament, a bake-off or shootout between design directions, several design concepts judged and narrowed, "test N ideas over M rounds", or wants the strongest visual direction picked with evidence rather than one designer's first try. Not for code, prose or naming contests.
---

# Design tournament

A design tournament finds the strongest visual direction by building several genuinely different directions, judging them blind on a written rubric, and narrowing with evidence. It exists because a single designer's first try anchors on one idea, and because "more sophisticated" is a judgment, not a test: the tournament turns taste into repeatable, inspectable scores while leaving the final call to the owner.

**Done when:** the owner has picked a direction from a finalist gallery that shows every entry, its renders, scores and judge notes; the winner is applied to the real target; and the report states the noise level, the narrowing and what was never tested.

Use the Workflow tool for the orchestration (it needs the owner's opt-in to multi-agent work; a request for a tournament is that opt-in). Start from `assets/tournament-workflow.js`.

## The process

### 0. Brief and taste intake (show once, then go)

- Quote the owner's taste words and references verbatim. Name the artifact, where it must work (surfaces, sizes, themes) and who decides.
- Write the **anti-references**: category clichés, competitor and platform marks to stay clear of, and the generic-AI list in `references/rubric.md`.
- **Never seed directions from one example the owner gave as an illustration.** Directions built from his example only let the judges pick a piece of it.
- Draft the rubric, gates, round plan (directions, rounds, keep counts) and judge lenses. Show them in one message and proceed unless the owner objects.

### 1. Harness before designers

- One **fixed content fixture** so only the design varies: the same page, data and copy for every entry, or the same name and sizes for a mark.
- One **build-and-capture command** that renders an entry into a fixed set of images (`references/rendering.md` has the matrix per artifact type) and runs the gates.
- **Gates are scripts that print FAIL** for what is objectively checkable: contrast, minimum text size, 375 px layout, palette or brand rules, an SVG audit. A FAIL disqualifies. Run each gate once on a known-bad sample to prove it can fail. Everything subjective goes to the judges, not the gates.
- Prove the harness on the baseline before launching.

### 2. Round 1: divergent directions

- 4 to 6 named directions that differ in **type family, palette and structural idea**, not just detail. Include the current baseline when there is one, and one "designer's own" slot.
- When the owner names two worlds (for example warm retro and futuristic), split the field between them so he sees both.
- Each designer iterates by rendering and reading its own images until its gates pass. Black-and-white first for marks.
- **Stay distinct:** a designer whose direction converges on another's typeface or palette must say so and push apart.

### 3. Blind judging

- Entries become neutral labels in a deterministic per-round shuffle. **The label key lives only in the orchestrator's memory or a folder no agent reads.** Folder and file names judges see carry no concept names.
- Three judges with different lenses (`references/judges.md`), each seeing every entry side by side and scoring every criterion against written anchors, plus one strength, one weakness and one concrete change per entry. Add a cross-model judge (for example Codex) when one is available, since a single model family shares blind spots.

### 4. Tally in code

- Clamp scores to the scale, average across judges, total per entry. Named tie-breaks (for example small-size or legibility, then distinctiveness), never list order.
- **Treat gaps under about 6% of the scale as ties.** Identical pixels have moved 6 points out of 100 between rounds.
- Re-judge a carried champion each round. If gains stay inside the noise for two rounds, stop and report a plateau instead of burning rounds.

### 5. Owner checkpoint after round 1

Stop after round 1 and show the owner a gallery of every direction with its scores and notes. His taste can keep a low scorer or cut a high one. Never run the remaining rounds unattended.

### 6. Later rounds

- Keep counts per round (for example 6 to 4 to 2, or champion plus three). Feed each designer its own judges' notes.
- Briefs per survivor: **REFINE** from the notes, **PUSH** the signature with one bold move, and **CHALLENGE** from the runner-up grafting the leader's best idea. Keep one fresh-direction slot open so the search doesn't narrow.
- Bring every surface the owner will need into the final rounds: dark and light, mobile and desktop, small sizes, real content. Don't discover them afterwards.

### 7. Final checkpoint and delivery

- Finalists with a recommendation; the owner picks. His taste overrides the score.
- Deliver (`references/deliverables.md`): a gallery artifact, the winner applied to the real target and to one surface it was not tuned on, a spec (tokens, type, signature, computed contrast), and an honesty section.

## Parameters

| Parameter | Default | Notes |
|---|---|---|
| Artifact | from the ask | logo or mark, UI screen or component, page, theme or design system, data viz |
| Directions | 6 | 4 minimum; split across the owner's named worlds |
| Rounds | 3 | more only while gains clear the noise |
| Keep counts | 6, 4, 2, 1 | or champion plus three with refine, push, challenge |
| Judges | 3 lenses | plus one cross-model judge when available |
| Rubric | `references/rubric.md` | 5 to 7 criteria with anchors; gates separate |
| Render matrix | `references/rendering.md` | per artifact type |
| Checkpoints | after round 1, at the final | more if the owner wants |
| Noise threshold | 6% of the scale | gaps below it are ties |

## Gotchas

- **Anchoring on the owner's one example** produces a pool of variations on it. Generate directions from the brief's adjectives and worlds instead.
- **Blinding leaks** through folder names, a key file beside the images, or names inside the judged text. Check what each judge can read.
- **Monoculture:** without a fresh slot, every survivor drifts to one typeface or palette by round 3.
- **Model-only taste:** the judges are models. Present results as evidence for the owner's decision, not as the decision.
- **Surfaces left out** (dark mode, small sizes, non-hero pages) come back as follow-up asks. Put them in the render matrix from round 2.
- **Gates for judgment calls** fake rigor. Gate only what a script can decide.
- **Eval leaks:** when the winner becomes a skill, keep eval files outside the skill folder so test agents can't read expected answers.

## References

- `references/rubric.md`: criteria with anchors, calibration, gates, the anti-generic list.
- `references/judges.md`: judge lenses per artifact type and the judge prompt.
- `references/rendering.md`: the render matrix per artifact type and the blind sheet rules.
- `references/deliverables.md`: gallery, spec, honesty section, applying the winner.
- `references/history.md`: the tournaments this skill is distilled from, with scores and what went wrong.
- `assets/tournament-workflow.js`: a Workflow script with blind sheets, lens judges, a clamped code tally, tie-breaks, a noise threshold and a stop after round 1 for the owner.
