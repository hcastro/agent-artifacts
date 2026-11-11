# run-design-tournament

This skill runs a multi-round tournament between design directions for visual and frontend work. Designer agents build several different directions. Judge agents score them blind against a written rubric, code tallies the scores, and the field narrows round by round. You pick the winner from a gallery of every entry with its renders, scores, and judge notes.

The skill works for logos and marks, UI screens and components, pages, themes and design systems, and data visualization. It isn't for code, prose, or naming contests.

## Before you begin

To use the skill, you need the following:

- An agent that can run subagents. The bundled Workflow script uses Claude Code's Workflow tool; other agents follow the same process with their own subagent tools.
- Headless Chrome or Playwright, to render each entry at its real sizes.
- Optional: The `logo-design` skill, which isn't in this repository. For marks, its render scripts produce the sheets. Without it, the agents capture SVG pages with headless Chrome.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `run-design-tournament`.

## Use the skill

Ask for a tournament, a bake-off, or several concepts judged and narrowed. The following requests trigger the skill:

- "Run a design tournament for the app's new logo: six directions over three rounds."
- "Do a bake-off between a warm retro theme and a futuristic theme for the dashboard."
- "Test four layouts for the pricing page and pick the strongest with evidence."

A request for a tournament counts as your opt-in to multi-agent work.

## How it works

The agent follows the process in [`SKILL.md`](SKILL.md):

1. **Brief.** The agent quotes your taste words and references, lists what to stay clear of, and drafts the rubric, gates, round plan, and judge lenses. It shows them once and goes ahead unless you object.
1. **Harness.** One fixed content fixture keeps everything but the design the same. One command renders each entry, and scripted gates such as contrast and minimum text size disqualify what fails.
1. **Round 1.** Four to six directions that differ in type, palette, and structure.
1. **Blind judging.** Entries get neutral labels. Three judges with different lenses score every entry against the rubric and give one strength, one weakness, and one change.
1. **Tally.** Code averages the scores, applies named tie-breaks, and treats gaps under about 6% of the scale as ties.
1. **Checkpoint.** The agent stops after round 1 and shows you every direction. You can keep a low scorer or cut a high one.
1. **Later rounds and delivery.** Survivors refine from their notes. The agent delivers a gallery, the winner applied to the real target, a spec, and a section on what the tournament never tested.

The scores are evidence for your decision. Your taste overrides them.

## Contents

The skill folder holds the following files:

- `SKILL.md`: the process, parameters, and gotchas.
- `references/rubric.md`: criteria with anchors, calibration, gates, and the list of generic patterns to avoid.
- `references/judges.md`: judge lenses per artifact type and the judge prompt.
- `references/rendering.md`: what to render for each artifact type, and the blind sheet rules.
- `references/deliverables.md`: the gallery, spec, honesty section, and how to apply the winner.
- `references/history.md`: the tournaments the skill is distilled from.
- `assets/tournament-workflow.js`: a Workflow script that runs the build, blind judging, and tally rounds.
