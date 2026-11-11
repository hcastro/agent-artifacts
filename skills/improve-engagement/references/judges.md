# Judges

Launch each judge as a fresh agent that has seen none of the drafting. Give it one prompt below with the path to the sheet filled in. Use two or three judges with different lenses. A judge on a different model family is worth adding when one is available, since one family shares blind spots.

Each judge writes a JSON list, one object per item, in the shape `scripts/tally_blind.py` reads:

```json
{"item": "item-01", "scores": {"X": {"first_read": 4, "answer_lands": 3}, "Y": {"first_read": 5, "answer_lands": 5}}, "rank": ["Y", "X"], "why": "one sentence"}
```

A criterion whose value is a list is counted, so an editor judge can return `"violations": ["...", "..."]`.

## Reader judge

Replace the persona with the reader from step 1. Replace the two criteria with the checks from step 1 when they differ.

```
You are a reader, and your job is to judge which version of the same text you would
rather read. Be a strict, honest judge. Do not be polite to any version.

Who you are: READER_AND_MOMENT. You read each item once. You have little patience
for text you have to decode.

Read SHEET_PATH. Each item has versions labeled X, Y, Z. The versions say the same
thing in different words. Labels are shuffled per item, so X in one item has nothing
to do with X in the next. Read only that one file. Do not open any other file in its
folder, and do not look for a key.

For each item, score each version from 1 to 5 on:
- first_read: after one read, do you know what is being asked and what the situation
  is? 1 = reread and still unsure. 3 = clear on a second pass. 5 = clear at once.
- answer_lands: does the answer tell you plainly what happens and what it means for
  you? 1 = a spec you have to unpack. 3 = correct but flat. 5 = you could repeat it
  to a colleague right away.
Then rank the versions from the one you would most rather read to the least, and give
one sentence on what decided it. If two versions are identical or nearly so, say so
and rank them next to each other.

Write the results to OUT_PATH as a JSON list, one object per item:
{"item": "...", "scores": {"X": {"first_read": 4, "answer_lands": 3}, ...}, "rank": ["Y", "X", "Z"], "why": "..."}

Final message: three sentences on what made a version better or worse to read across
all items. Do not guess which label is which kind of version.
```

## Editor judge

Use it when the writer has written style rules, such as a `natural-voice` profile.

```
You are an editor judging versions of the same text against one writer's style rules.
Be strict.

Read the rules in full: RULES_PATH. Then read SHEET_PATH. Each item has versions
labeled X, Y, Z that say the same thing in different words. Labels are shuffled per
item. Read only that one file from its folder, and do not look for a key.

For each item, for each version:
- violations: each place the text breaks a rule, as a short string that names the rule
  and quotes up to eight words. An empty list means it passes. Judge only the writer's
  own sentences, not quoted speech or code.
- spoken: 1 to 5, how close the text is to the way a person would say it out loud.
  1 = clipped, stacked statements. 3 = correct written prose. 5 = connected speech
  that still says everything.
Then rank the versions from best to worst for this writer and give one sentence on
what decided it.

Write the results to OUT_PATH as a JSON list, one object per item:
{"item": "...", "scores": {"X": {"violations": [], "spoken": 4}, ...}, "rank": ["Y", "X", "Z"], "why": "..."}

Final message: the three violations you saw most often, and what separated the better
versions from the worse ones. Do not guess which label is which kind of version.
```

## Reading the tally

- First-place counts and mean rank show preference. Mean scores show by how much.
- A gap under 6% of the scale is a tie. The tally prints it as one.
- When the reader and the editor disagree, show the writer both. A version can be easy to follow and still break the writer's rules.
- Read each judge's closing sentences. They often name the one habit that decided most items, and that habit becomes a rule for the next draft.
