# improve-engagement

This skill helps your agent turn a correct but dense draft into text a person wants to read, and it tests the result before you accept it. A voice pass cleans up sentences. This skill changes the shape of the text, then has fresh reader agents compare the versions without knowing which is which.

Use it for courses, lessons, guides, documentation, explainers, and posts.

## Before you begin

To use the skill, you need the following:

- An agent that can run subagents. The rewrite, the judges, and the fidelity check each run as a fresh agent. Without subagents, the agent rewrites the text and tells you the result wasn't tested.
- Python 3.8 or later for the bundled scripts. They use only the standard library.
- Optional: The [`natural-voice`](../natural-voice) skill, or your own style rules, for the voice pass and the editor judge.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `improve-engagement`.

## Use the skill

Tell the agent that a draft is hard to read, or ask it to compare versions. The following requests trigger the skill:

- "This lesson is correct but it reads like a spec. Make it engaging."
- "The onboarding guide is dense. Rewrite one chapter and show me that it's better."
- "Which of these two versions of the README would a new user rather read?"

For sentence-level cleanup alone, use `natural-voice`.

## How it works

The agent follows the process in [`SKILL.md`](SKILL.md). The following figure shows the loop:

![Eight boxes in two rows. The top row runs left to right: name the reader, measure the draft, rewrite one sample, and the script guard. The bottom row runs right to left: the blind read test, the fidelity check, the writer's pick, and applying the pick to the rest of the text. A dashed edge goes from the fidelity check back to the rewrite, and another goes from the blind read test back to naming the reader when no version beats the original.](assets/01-loop.webp)

Diagram source: `assets/diagrams-source.html`, rendered with the `doc-diagrams` skill.

The steps are as follows:

1. **Reader and checks.** The agent names who reads the text and in what moment, then writes three to five checks for "engaging" that a reader could score.
1. **Measure.** A script counts words per sentence, long sentences, and technical names per sentence, so you can see where the draft is heavy.
1. **Sample.** The agent rewrites one section. A structure pass changes order, load per sentence, and what the text says it means for the reader. A voice pass follows.
1. **Blind read test.** A script checks the rewrite for new names, new numbers, and changed quotations. Then judge agents read unlabeled versions and score them. A second script tallies the scores and marks small gaps as ties.
1. **Fidelity check.** A checker agent lists every claim the rewrite dropped, added, or changed.
1. **Your pick.** The agent shows you the tally, the numbers, and before and after pairs. You choose, and the agent applies your choice to the rest of the text.

The scores are evidence for your decision. Your taste overrides them.

## Run the scripts yourself

The scripts work on one JSON file that holds every version of every item:

```json
{"item-01": {"original": {"text": "..."}, "rewrite": {"text": "..."}}}
```

The following commands measure the versions, check the rewrite, build a blind sheet, and tally the judges:

```bash
python3 scripts/measure_density.py --versions versions.json
python3 scripts/check_rewrite.py versions.json --base original --new rewrite
python3 scripts/build_blind_sheet.py versions.json --sheet trial/sheet.json --key trial-key/key.json
python3 scripts/tally_blind.py --key trial-key/key.json trial/judge-*.json
```

`build_blind_sheet.py` refuses to write the key into the same folder as the sheet, because a judge that can list the folder can find it.

## Contents

The skill folder holds the following files:

- `SKILL.md`: the six-step process and the gotchas.
- `references/structure-pass.md`: what the rewrite may change, what must hold, and an example.
- `references/judges.md`: prompts for the reader judge and the editor judge, and how to read the tally.
- `references/fidelity.md`: the prompt for the fidelity check and what to do with its report.
- `scripts/measure_density.py`: counts what makes a draft heavy.
- `scripts/check_rewrite.py`: finds new code names, new numbers, changed quotations, and outsized growth.
- `scripts/build_blind_sheet.py`: builds the unlabeled sheet and a separate key.
- `scripts/tally_blind.py`: tallies judge results against the key.
- `assets/01-loop.webp` and `assets/diagrams-source.html`: the figure in this README and its source.
