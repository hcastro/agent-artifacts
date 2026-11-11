---
name: improve-engagement
description: Makes a correct but dense or flat draft engaging to read, and proves the result with a blind reader test. Names the reader and what engaging means for them, measures what makes the draft hard, rewrites structure before voice, has fresh reader agents compare unlabeled versions, checks that no fact changed, and leaves the pick to the writer. Use when the user says a draft is dry, dense, flat, boring, a chore or "reads like a spec", asks to make writing more engaging or easier to read, or wants versions of a text compared with evidence. Works for courses, lessons, guides, docs, explainers and posts. Not for sentence-level cleanup alone, which is the natural-voice skill's job.
---

# Improve engagement

A voice pass removes the patterns that make text read as machine-written. It leaves the shape of the text alone, so a clean draft can still be a chore to read. This skill changes the shape: what comes first, how much each sentence carries, and whether the reader learns what the text means for them. Then it tests the result on readers who haven't seen the draft, because the writer and the rewriting agent both expect their own version to win.

**Done when:** the writer has picked a version from a blind comparison, the fidelity check is clean, and the pick is applied to the whole text.

The rewrite, the judges and the fidelity check each run as a fresh subagent. Without subagents, do steps 1 to 3 and tell the writer the result was not tested.

## Workflow

```
- [ ] 1. Name the reader and write the checks
- [ ] 2. Measure the draft
- [ ] 3. Rewrite one sample: structure pass, then voice pass
- [ ] 4. Run the script guard, then the blind read test
- [ ] 5. Run the fidelity check and fix what it finds
- [ ] 6. Show the writer, apply the pick, record the rule
```

### 1. Name the reader and write the checks

Write down who reads this, in what moment, and what they do next. Then write three to five checks for "engaging" that a reader could score. Quote the writer's own complaint in them.

Checks that have worked:

- After one read of the question or the opening, the reader knows what is being asked.
- The answer or the body opens with the verdict.
- The reader learns what the fact means for them, or what to do.
- A sentence carries one idea and at most two technical names.

Many writers ban hooks, held-back reveals, rhetorical questions and closing lines. The default `natural-voice` profile bans all four. When they are off the table, engagement comes from order, load per sentence and consequence for the reader. Say so in the brief, or the rewrite reaches for drama.

### 2. Measure the draft

Run `scripts/measure_density.py` on the draft. It prints words per sentence, long sentences, and code names, acronyms and numbers per sentence. These numbers say where the draft is heavy. They also show whether a rewrite changed the shape: a pass that moves none of them was a voice pass.

### 3. Rewrite one sample

Pick one section that stands for the whole, about 10 to 20 items or 1,500 words. Do not rewrite everything first. Taste misses are common, and a sample costs a tenth as much.

Give a fresh agent the sample, the checks from step 1 and [references/structure-pass.md](references/structure-pass.md). That file lists what the pass may change and what must hold. When the rewrite is done, run a voice pass over it with the `natural-voice` skill in edit mode, or with the writer's own style rules.

Keep three versions when you can: the original, a voice-only pass, and the structure pass. The voice-only version is the control. If readers can't tell it from the structure pass, structure was not the problem.

Store the versions in one file:

```json
{"item-01": {"original": {"question": "...", "answer": "..."}, "light": {...}, "deep": {...}}}
```

Any part names work. For running prose, use one part per section.

### 4. Script guard and blind read test

Run the guard. It finds what a script can see: new code names, new numbers, changed quotations and parts that grew too much.

```bash
python3 scripts/check_rewrite.py versions.json --base original --new deep
```

Fix each finding or accept it on purpose, then build the blind sheet:

```bash
python3 scripts/build_blind_sheet.py versions.json --sheet trial/sheet.json --key trial-key/key.json
```

The script gives the versions neutral labels, shuffles them per item, and refuses to write the key beside the sheet. Launch two or three fresh judge agents with the prompts in [references/judges.md](references/judges.md). Each judge gets the path to the sheet and nothing else. Then tally:

```bash
python3 scripts/tally_blind.py --key trial-key/key.json trial/judge-*.json
```

The tally prints mean scores, mean rank and first-place counts per version, and it marks gaps under 6% of the scale as ties. If no version beats the original outside that margin, stop and tell the writer. Go back to step 1 with their reaction.

### 5. Fidelity check

A structure pass moves and rewords claims, so it can change one. Give a fresh agent the original and the winning version with the prompt in [references/fidelity.md](references/fidelity.md). It lists every claim that was dropped, added or changed, and every place a rewrite gives away an answer or refers to something the reader can't see. Fix each one, then run the guard again. If the original was fact-checked, send anything the check calls "added" back through that fact check.

### 6. Show the writer, apply, record

Show the tally, the density numbers before and after, three before and after pairs, and the fidelity fixes. The scores are evidence. The writer's taste decides, and it can pick a version the judges ranked lower.

Apply the picked pass to the rest of the text with the same brief, in batches, running the guard and the fidelity check on each batch. Write the writer's reason for the pick into the brief or the voice profile as a rule, so the next draft starts from it.

## Gotchas

- **The key leaks.** A judge that can list the sheet's folder finds the key. Keep it in a folder no judge is told about. Version names inside item ids leak too, which is why the sheet renames items.
- **The brief's examples get copied.** A rewriting agent reuses a brief's sample sentences word for word. Check each sample against what the reader sees. An example that says a file is "shown beside the question" is wrong for every item where it isn't.
- **A voice-only pass looks like progress.** It changes a fifth of the text and moves no density number. Readers still prefer it to the original, so it passes for a fix until it sits next to a structure pass.
- **A verdict-first opening can add a claim.** Moving the conclusion to the front tempts the rewrite to sharpen it. In testing, the fidelity check caught an opening line that judged two things alike when the draft treated them differently.
- **Split sentences pile up.** Editor judges marked the structure pass down for blocks of five to seven sentences. Break them into paragraphs before judging.
- **Longer is not the goal.** A structure pass usually runs longer, because one packed sentence becomes two. Report the word counts next to the scores, and cap growth in the guard.
- **Judges are models.** Use at least two lenses, a reader and an editor, and present the result as evidence. Identical text moves a few percent between runs.
- **Help text gives answers away.** Hints, primers and option text were written to hold something back. Rewrite their sentences and add nothing to them.
- **Quoted speech stays.** A quotation in the draft belongs to someone else. The guard reports any that changed.
