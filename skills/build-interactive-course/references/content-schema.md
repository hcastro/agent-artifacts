# Content schema

The starter kit reads a course as data. `course.json` names the course, its lines and its stops. One file per stop holds the questions and everything around them. The page code never names the subject, so this shape is a contract: extra keys are ignored, and missing keys either fail the build or weaken the page.

## Contents

1. [How the page teaches](#how-the-page-teaches)
2. [Files and the build](#files-and-the-build)
3. [course.json](#coursejson)
4. [The stop file](#the-stop-file)
5. [Ideas and primers](#ideas-and-primers)
6. [Question fields](#question-fields)
7. [Formats](#formats)
8. [Probes](#probes)
9. [Levels and the difficulty mix](#levels-and-the-difficulty-mix)
10. [Finals, cards and open questions](#finals-cards-and-open-questions)
11. [Progress and starting levels](#progress-and-starting-levels)
12. [Writing rules](#writing-rules)

## How the page teaches

- One question at a time. A miss shows a narrower question, never the answer.
- The answer shows after three misses, or when the learner presses "Just tell me". The same idea then comes back at once as a re-test from another angle, and the given-away answer earns nothing.
- A level rises only on evidence: two different questions right at the level's difficulty, at least one answered cold, meaning on an idea the learner was not just primed, told or asked about.
- Surprise reviews of other stops arrive unannounced. Missing one costs a level.
- A short placement per line sets starting levels. Level 5 needs a teach-back. When every stop on a line reaches the target, a final mixed assessment opens.
- Every submit carries a confidence call (sure, think so, guessing), and the home page shows how often each call was right.

Content has to serve those rules. Every idea needs two or more questions so the re-test has somewhere to go, and every question needs probes that narrow without telling.

## Files and the build

```
course.json
content/<stop-id>.json     one per stop, named by the stop id
build/head.html            title and stylesheet ({{title}} is filled in)
js/*.js                    the engine, the loop and the views
js/components/*.js         one file per question format, built in or invented
sources/                   in the sample only: the made-up handbook its evidence points at
```

Build with `python3 scripts/build_course.py <course_dir> --out <dir>`. It validates everything below, prints every problem, and writes one file, `course.html`, with the styles, the scripts and `course.json` plus every stop folded in. Errors exit 1 and write nothing: a broken `course.json`, invalid JSON, a repeated id, or a question the page cannot show (unknown format, wrong option count, bucket ids that do not match, a written answer without a rubric, spot lines outside the block). Warnings leave the page working, but say what is weaker, such as a level nobody can earn.

Every file in `js/components/` is built into the page, and its file name becomes a valid `format`. That is how a course adds a component. See [components.md](components.md).

## course.json

```json
{
  "title": "Course name",
  "home_title": "The course map",
  "topic": "one line used in the plain-text map, the save block and the agent prompt",
  "target_level": 4,
  "lines": [
    { "id": "o", "name": "Line name", "short": "Short", "about": "One sentence.",
      "stops": [ { "id": "o1", "name": "Stop name", "tag": "short tag", "about": "optional one line" } ],
      "placement": ["o1", "o3"] }
  ],
  "standings": [[0, "New"], [12, "Second standing"], [40, "Third standing"]],
  "storage_key": "my-course-v1"
}
```

- `title` heads the page and the browser tab. `home_title` is the big headline on the map.
- `target_level` is 4 (can do independently) or 5 (can teach it). The learner can change it.
- `lines`: 1 to 4. Each line gets its color from its position, `line-1` to `line-4` in the stylesheet, so the order in this file is the color order.
- `stops`: 1 to 10 per line. A lesson is one line with one stop, a module is one line of three to seven, and a course has several lines. Stop ids are unique across the course and name the content file. `tag` is the short label on chips and buttons. `about` shows under the stop on the map.
- `placement`: the stops the placement samples, one question each. Leave it out to sample every stop. Five is a good size for a long line.
- `standings`: `[percent, name]` pairs, starting at 0 and rising. The name shown is the last one at or below overall mastery.
- `storage_key`: the local storage key, the first line of the save block and the `course` field of a progress file. Some browsers share one storage area across every file opened from disk, so make it unique. Change it when a new version of the course should not read old progress.

A line with any stop that has no questions yet stays off the map, so a course can ship one finished line while others are written.

## The stop file

```json
{
  "stop": "o1",
  "ideas": [ ... ],
  "questions": [ ... ],
  "finals": [ ... ],
  "cards": [ ... ],
  "open_questions": [ ... ]
}
```

## Ideas and primers

```json
{ "id": "o1.limits", "name": "Item limits", "primer": "At most 60 words." }
```

An idea is one thing to understand. Two to seven per stop. Every question points at one idea, and cards open by idea.

The primer shows once, before the first question on that idea, and only to a learner at level 0 or 1 at that stop. It introduces facts the learner could not work out alone, such as names, numbers and rules. It never answers a question or hints at which option is right. Keep it to 60 words. The build warns over that, and `merge_prose.py` refuses a rewrite over it.

## Question fields

```json
{
  "id": "o1-q01", "idea": "o1.limits", "type": "predict", "difficulty": 3, "format": "choice",
  "title": "Six words at most", "prompt": "80 words at most. `code`, **bold** and \n allowed. No HTML.",
  "context": { "kind": "table", "label": "Where it comes from", "body": "25 lines at most" },
  "answer": "Two to five sentences, shown after the learner succeeds or is told.",
  "owner": "So you can ... (one line on why this matters to the learner)",
  "evidence": ["src/limits.py:12-30"],
  "probes": ["After the first miss.", "After the second miss, narrower still."],
  "challenge": { "prompt": "Are you sure? ...", "hold": true, "why": "Shown after the learner decides." },
  "rel": "owner", "resume": "open", "diagnostic": false
}
```

- `id`: unique across the course. `<stop>-q<two digits>` keeps files tidy.
- `type`: `predict`, `explain`, `flaw`, `apply`, `connect` or `teach`. Shown as a chip.
- `difficulty`: 1 recall with understanding, 2 one step of reasoning, 3 two rules interacting, 4 failure paths and consequences that are not obvious, 5 edge cases and plausible wrong claims.
- `format`: which component asks the question. See [Formats](#formats).
- `title`: names the situation without giving away the answer.
- `context` (optional): something to read beside the question. `kind` is `code`, `config`, `log`, `json`, `table` or `chat`. For `chat`, `body` is a list of `{ "role": "user" | "assistant", "text": "..." }`. Otherwise `body` is a string. Never include secrets or personal data.
- `answer`: the reference explanation, shown once the question settles. The prompt for a coding agent holds the rubric and leaves this out.
- `owner` (optional): one line, shown under the answer, on what the learner can now do. Keep one opening across the course, such as "So you can".
- `evidence` (optional): short source references, rendered as code chips under the answer. Write them as `path:line` or `path:start-end`, relative to the source root, so `scripts/check_evidence.py` can find the ones that went stale. Add a note after the reference when a document exists only on an unmerged branch.
- `challenge` (optional, about one question in five, difficulty 3 or higher): a devil's-advocate push after a clean first answer. `hold: true` means the learner was right and should stand by it. `hold: false` means the push names a real exception they should concede.
- `rel` (optional): `owner` (the default), `useful` or `mechanics`. Mechanics questions test details a learner could look up, such as an exact name or the order of statements. They are hidden until the learner turns them on in Progress. When questions are equally close to the target difficulty, owner questions come first, then useful, then mechanics.
- `resume` (optional): `open` marks the question an earlier session left open, and `misconception` marks one that tests a mistake the learner made before. Both are used only after the learner accepts starting levels (below), asked cold. Tagged questions stay out of the placement.
- `diagnostic`: `true` on one `choice` question per stop, difficulty 2 or 3, answerable in under a minute. The placement uses it. Without one, it takes the first `choice` question at difficulty 2 or 3.

## Formats

Nine components ship with the kit. [components.md](components.md) has each one's fields with an example, its grading, and its keyboard and phone behavior. In short:

| Format | Fields it adds | Graded on |
|---|---|---|
| `choice` | `options`: 3 to 6, one `correct`, a `probe` on each wrong one | The picked option |
| `multi` | `options`: 4 to 6, two or more `correct`, a `probe` on each | The exact set, all or nothing |
| `order` | `items`: 3 to 7 strings in the correct order | Every item in place |
| `bucket` | `buckets`: 2 to 6 `{ id, label }`, `items`: 4 to 8 `{ text, bucket, why }` | Every item in its bucket |
| `text` | `rubric`: `must` (2 to 5 points), `pass`, `misconceptions` | The written-answer check |
| `reveal` | `block`: `shown`, `hidden`, `hidden_label`, then `options` or `rubric` | Like `choice`, or the written-answer check |
| `replay` | `steps`: 2 to 20 `{ label, detail, time }`, some with `pause`: `{ prompt, options }` | Each call at a pause |
| `spot` | `block.body`: 2 to 40 lines, `lines`, optional `line_probes` and `line_notes` | The exact set of line numbers |
| `estimate` | `value`, `range`, `unit`, optional `scale`, `decimals`, `probe_low`, `probe_high` | The number inside `range` |

For `choice`, `multi`, `reveal` and replay pauses, an option looks like this:

```json
{ "id": "b", "text": "A mistake a smart learner would make", "correct": false, "probe": "Narrower question about this mistake." }
```

Only use `order` when the order is forced, meaning each step depends on the one before.

The written-answer check, for `text` and for `reveal` without options, has two paths. By default the learner ticks each `must` point their answer clearly made, so write points a learner can judge honestly. Or the learner presses "Check with my agent": the page copies a prompt with the question, the answer, the rubric and grading rules, and the learner pastes it into any coding agent and reports "Got it" or "Not yet". `pass` is how many points are needed, and defaults to all.

```json
"rubric": {
  "must": ["A point the answer has to state.", "A second point."],
  "pass": 2,
  "misconceptions": [ { "claim": "Says X.", "probe": "Narrower question for that mistake." } ]
}
```

**`teach`** (a type, not a format): one per stop, `format: "text"`, difficulty 5. The prompt asks the learner to explain the stop's central idea to someone new in 150 words or fewer. The agent prompt tells the agent to pass it only when it would trust the explanation unchanged. It is asked once a stop reaches level 4 with two clean answers at difficulty 5.

A custom format is any file in `js/components/`. Give its questions a `rubric` too, so the text fallback can be checked when the component cannot use the data.

## Probes

A probe is a narrower question that exposes the gap in the learner's reasoning. It points at one concrete thing to look at, count or compare. It never contains or implies the answer.

- Weak: "Remember that the limit is 25 items."
- Strong: "Add the items already out to the items in hand. What is the total limit?"

Order of use after a miss: the component's own probe (the picked option's `probe`, the replay call's `probe`, a spot `line_probes` entry, or `probe_low` and `probe_high`), then the agent's narrower question for a written answer, then `probes[0]` and `probes[1]`. Give every question exactly two generic `probes`.

## Levels and the difficulty mix

Levels run 0 (unaware) to 5 (can teach it). Level N needs two different questions answered right at difficulty N or higher, at least one of them cold. Levels 4 and 5 count only first-try answers, and a self-checked written answer counts as "with a nudge", so a written answer earns those levels only through a first-attempt "Got it" from an agent. Level 5 also needs the teach-back.

So, at every stop, once mechanics questions are hidden, there must be at least two questions at each difficulty from 1 to 5, not counting the teach question. Fewer than two at some level and that level cannot be earned. The build warns about every stop where that happens.

A good stop has about 10 to 16 questions, and a one-stop lesson 8 to 12:

- two or more at each difficulty from 1 to 5, plus one `teach`
- formats chosen by the reasoning each idea needs, with closed formats at difficulty 4 and 5 so those levels can be earned without an agent
- a mix of types, with at least one `flaw` and one `connect`
- one `diagnostic`, a `context` on a few, a `challenge` on a few
- any `mechanics` questions on top of that count

## Finals, cards and open questions

**Finals**: one or two integrative problems per stop, in `finals`. Same shape as a `text` question, with `format` text, difficulty 5 and 4 to 6 rubric points. Add `"integrative": true` and `"spans": ["o1", "o3"]` to record which stops it ties together. A line's final asks one hard closed question per stop, then one of these, with no hints. It passes with at most one miss and the integrative problem right. A missed stop drops a level.

**Cards**: short references the learner collects. Two to eight per stop.

```json
{ "id": "o1-c01", "title": "Item limits", "kind": "table", "source": "docs/limits.md:4-18",
  "body": "A short excerpt, 25 lines at most", "note": "What it is and the one thing people get wrong.",
  "ideas": ["o1.limits"] }
```

A card opens the first time the learner answers a question on one of its `ideas` without being told. `check_evidence.py` checks `source` the same way as `evidence`.

**Open questions**: things the sources could not answer, which the learner should ask someone. The Questions page lists them by urgency, with a checkbox and a notes field each.

```json
{ "id": "o1-o01", "question": "One sentence, as you would ask it.", "why": "What goes wrong if nobody knows.",
  "urgency": 1, "source": "docs/limits.md:20" }
```

`urgency` is 1 (ask first), 2 (ask soon) or 3 (good to know, the default).

## Progress and starting levels

Progress lives in the learner's browser, in local storage under `storage_key`. The Progress page can download it as a progress file, load one back, copy the save block, restore from a pasted block, and erase everything. [design-and-state.md](design-and-state.md) covers where progress lives, and [tutor-rules.md](tutor-rules.md) documents both formats.

Starting levels for one learner, from earlier tutoring, arrive only in a progress file or save block that learner loads:

```json
{ "format": "course-progress", "version": 1, "course": "my-course-v1",
  "resume": { "levels": { "o1": 2, "o2": 1 }, "line": "o", "focus": "o1" } }
```

Levels are capped at 3. `line` and `focus` are optional. That learner sees a choice between the starting levels and the placement. Questions tagged `resume` on that line then come back cold, the `open` one first. Never write starting levels into `course.json`, a stop file or the built page, where every learner would get them.

## Writing rules

- American spelling. Sentence case. No em dashes and no semicolons: start a new sentence.
- Plain words and short sentences. Identifiers in backticks.
- No praise, no exclamation marks and no rhetorical questions in answers.
- Wrong options are real mistakes, never jokes.
- Check every correct answer against the source. When the source does not settle a point, make it an open question instead.
- Validate with `python3 -c "import json,sys; json.load(open(sys.argv[1]))" <file>`, then run the build.
- To polish prose without touching facts, run `scripts/extract_prose.py`, rewrite the extracted fields, and merge with `scripts/merge_prose.py`, which refuses any field that changed a number, code span, quotation or limit.
