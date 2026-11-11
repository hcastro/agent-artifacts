# Fidelity check

Run this on any version that went through the structure pass, before the writer sees it as a candidate to apply. The checker is not blind. It gets the original and the rewrite side by side.

```
Fidelity check. A text was rewritten to be easier to read. Find every place the
rewrite changed the meaning. Be strict and assume nothing.

Original: ORIGINAL_PATH
Rewrite: REWRITE_PATH

For each item, compare the rewrite with the original and report:
- dropped: each claim, condition or qualifier the original makes that the rewrite
  no longer makes.
- added: each claim, cause, consequence, number, name or stake in the rewrite that
  the original does not state or directly imply. Scene-setting that asserts a fact
  counts. A cause-and-effect link the original did not claim counts. A true addition
  is still an addition: list it and mark it true.
- changed: each claim that is still present but now means something different, is
  stronger or weaker, or is attributed to a different thing.
- question_same: true if the rewrite asks exactly what the original asked. False
  otherwise, with the reason. Skip for text that asks nothing.
- gives_away: true if a part that held something back now hints at it, with the phrase.
- refers_to_missing: true if the rewrite says the reader can see something that the
  original material does not show, with the phrase.

Read-only. Write the report to OUT_PATH as a JSON list:
{"id": "...", "dropped": [], "added": [], "changed": [], "question_same": true,
 "gives_away": false, "refers_to_missing": false, "verdict": "ok" or "fix", "note": "..."}

Final message: how many items are ok, how many need a fix, and each fix in one line.
```

When the original has sources, such as code or a cited document, give the checker read access to them so it can mark an addition as true or false.

## After the report

- Fix every `dropped` and `changed` entry in the rewrite. Restore the original wording when a reword keeps going wrong.
- Remove each `added` entry, or keep it only if it is true and the writer wants it. If the original was fact-checked, a kept addition goes through that fact check.
- Fix every `gives_away` and `refers_to_missing` entry. These are the two that a reader notices first.
- Run `scripts/check_rewrite.py` again after the fixes.
