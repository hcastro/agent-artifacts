# Judges

Three lenses that disagree in useful ways beat three copies of one generalist. Every judge sees every entry side by side, scores every criterion, and returns per entry: scores, one strength, one weakness, one concrete change.

## Lenses by artifact

| Artifact | Lens 1 | Lens 2 | Lens 3 |
|---|---|---|---|
| Logo or mark | Art director who knows the owner's named era or world | Identity craftsperson: geometry, optical balance, 16 px, one colour, reversed | Brand strategist: one-sentence idea, category clichés, competitor and platform marks, ownability |
| UI screen, page or component | Product design director: hierarchy, restraint, signature | Interaction and accessibility specialist: touch targets, states, contrast, 375 px | Brand strategist: fit with the owner's words, distance from generic defaults |
| Theme or design system | Editorial or product design director | Typographer and systems designer: scale, tokens, coherence across surfaces and themes | Brand strategist or brand manager for the reference brand |
| Data visualization | Editorial design director | Data-viz specialist: legibility at phone width, annotation, honest encoding | Brand strategist for distance or fidelity |

Add a cross-model judge (for example Codex through `codex exec`, reading the same images) when available, and report whether it agreed with the others.

## Judge prompt skeleton

```
<the brief, the owner's taste words, the anti-generic list>
You are <lens>. This is round <n> of a blind design tournament. Read every image listed
below with the Read tool, side by side, before scoring any entry.
Score each entry on each criterion using the anchors below. Calibration: half marks are
mediocre, 80% very good, 95%+ exceptional and rare. Use the whole range.
For each entry return: the scores, one strength, one weakness, one concrete change the
designer can act on.
<rubric with anchors>
<Entry k: image paths only, no names>
```

Use a JSON schema for the scores so the tally is code, not a model reading prose.
