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
11. [Progress and resume offers](#progress-and-resume-offers)
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
build/head.html            title, fonts, stylesheet ({{title}} is filled in)
js/*.js                    the engine and views
```

Build with `python3 scripts/build_course.py <course_dir> --out <dir>`. It validates everything below, prints every problem, and writes `index.html`, `preview.html` (a full document for local testing), `js/` and `data/content.json`, which is `course.json` plus every stop folded together. Errors exit 1: a broken `course.json`, invalid JSON, a repeated id, or a question the page cannot show (unknown format, wrong option count, bucket ids that do not match, a text question without a rubric). Warnings leave the page working, but say what is weaker, such as a level nobody can earn.

## course.json

```json
{
  "title": "Course name",
  "home_title": "The course map",
  "topic": "one line used in the plain-text map, the save block and the grader prompt",
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
- `stops`: 3 to 10 per line. Stop ids are unique across the course and name the content file. `tag` is the short label on chips and buttons. `about` shows under the stop on the map.
- `placement`: the stops the placement samples, one question each. Leave it out to sample every stop. Five is a good size for a long line.
- `standings`: `[percent, name]` pairs, starting at 0 and rising. The name shown is the last one at or below overall mastery.
- `storage_key`: the `localStorage` key and the save-block label. Change it when a new version of the course should not read old progress.

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
  "evidence": ["Source, section 2.1"],
  "probes": ["After the first miss.", "After the second miss, narrower still."],
  "challenge": { "prompt": "Are you sure? ...", "hold": true, "why": "Shown after the learner decides." },
  "rel": "owner", "resume": "open", "diagnostic": false
}
```

- `id`: unique across the course. `<stop>-q<two digits>` keeps files tidy.
- `type`: `predict`, `explain`, `flaw`, `apply`, `connect` or `teach`. Shown as a chip.
- `difficulty`: 1 recall with understanding, 2 one step of reasoning, 3 two rules interacting, 4 failure paths and consequences that are not obvious, 5 edge cases and plausible wrong claims.
- `title`: names the situation without giving away the answer.
- `context` (optional): something to read beside the question. `kind` is `code`, `config`, `log`, `json`, `table` or `chat`. For `chat`, `body` is a list of `{ "role": "user" | "assistant", "text": "..." }`. Otherwise `body` is a string. Never include secrets or personal data.
- `answer`: the reference explanation. Claude also grades against it, and never shows it to the learner while grading.
- `owner` (optional): one line, shown under the answer, on what the learner can now do. Keep one opening across the course, such as "So you can".
- `evidence` (optional): short source references, rendered as code chips under the answer.
- `challenge` (optional, about one question in five, difficulty 3 or higher): a devil's-advocate push after a clean first answer. `hold: true` means the learner was right and should stand by it. `hold: false` means the push names a real exception they should concede.
- `rel` (optional): `owner` (the default), `useful` or `mechanics`. Mechanics questions test details a learner could look up, such as an exact name or the order of statements. They are hidden until the learner turns them on in Progress. When questions are equally close to the target difficulty, owner questions come first, then useful, then mechanics.
- `resume` (optional): `open` marks the question an earlier session left open, and `misconception` marks one that tests a mistake the learner made before. Both are used only after a resume offer (below), asked cold. Tagged questions stay out of the placement.
- `diagnostic`: `true` on one `choice` question per stop, difficulty 2 or 3, answerable in under a minute. The placement uses it. Without one, it takes the first `choice` question at difficulty 2 or 3.

## Formats

**`choice`**: 3 to 6 options, exactly one correct. Four is the norm. Each wrong option carries its own `probe`.

```json
"options": [
  { "id": "a", "text": "25 words at most", "correct": true },
  { "id": "b", "text": "A mistake a smart learner would make", "correct": false, "probe": "Narrower question about this mistake." }
]
```

**`multi`**: 4 to 6 options, 2 or more correct, graded all or nothing. Give every option a `probe`. It shows when the learner picks a wrong option or leaves out a right one.

**`order`**: `items`, 3 to 7 strings, listed in the correct order. The page shuffles them and the learner moves them with arrows. Only use it when the order is forced, meaning each step depends on the one before.

**`bucket`**: `buckets`, 2 to 6 `{ "id", "label" }`, and `items`, 4 to 8 `{ "text", "bucket", "why" }`. `why` shows under each item after grading. A miss reports how many are in the right place.

**`text`**: free text graded by Claude through the page's `sample` capability.

```json
"rubric": {
  "must": ["A point the answer has to state.", "A second point."],
  "pass": 2,
  "misconceptions": [ { "claim": "Says X.", "probe": "Narrower question for that mistake." } ]
}
```

`must` holds 2 to 5 points, each plain enough that a grader can tell whether the learner said it. `pass` is how many are needed, and defaults to all. When Claude grading is unavailable, the learner ticks the points their answer made, so write points a learner can judge honestly.

**`teach`** (a type, not a format): one per stop, `format: "text"`, difficulty 5. The prompt asks the learner to explain the stop's central idea to someone new in 150 words or fewer. Claude passes it only when it would trust the explanation unchanged. It is asked once a stop reaches level 4 with two clean answers at difficulty 5.

## Probes

A probe is a narrower question that exposes the gap in the learner's reasoning. It points at one concrete thing to look at, count or compare. It never contains or implies the answer.

- Weak: "Remember that the limit is 25 items."
- Strong: "Add the items already out to the items in hand. What is the total limit?"

Order of use after a miss: the picked option's `probe` (choice and multi), then Claude's probe (text), then `probes[0]` and `probes[1]`. Give every question exactly two generic `probes`.

## Levels and the difficulty mix

Levels run 0 (unaware) to 5 (can teach it). Level N needs two different questions answered right at difficulty N or higher, at least one of them cold. Levels 4 and 5 count only first-try answers. Level 5 also needs the teach-back.

So, at every stop, once mechanics questions are hidden, there must be at least two questions at each difficulty from 1 to 5, not counting the teach question. Fewer than two at some level and that level cannot be earned. The build warns about every stop where that happens.

A good stop has about 10 to 16 questions:

- two or more at each difficulty from 1 to 5, plus one `teach`
- all five formats across the stop, with `choice` the most common
- a mix of types, with at least one `flaw` and one `connect`
- one `diagnostic`, a `context` on a few, a `challenge` on a few
- any `mechanics` questions on top of that count

## Finals, cards and open questions

**Finals**: one or two integrative problems per stop, in `finals`. Same shape as a `text` question, with `format` text, difficulty 5 and 4 to 6 rubric points. Add `"integrative": true` and `"spans": ["o1", "o3"]` to record which stops it ties together. A line's final asks one hard closed question per stop, then one of these, with no hints. It passes with at most one miss and the integrative problem right. A missed stop drops a level.

**Cards**: short references the learner collects. Two to eight per stop.

```json
{ "id": "o1-c01", "title": "Item limits", "kind": "table", "source": "Where it comes from",
  "body": "A short excerpt, 25 lines at most", "note": "What it is and the one thing people get wrong.",
  "ideas": ["o1.limits"] }
```

A card opens the first time the learner answers a question on one of its `ideas` without being told.

**Open questions**: things the sources could not answer, which the learner should ask someone. The Questions page lists them by urgency, with a checkbox and a notes field each.

```json
{ "id": "o1-o01", "question": "One sentence, as you would ask it.", "why": "What goes wrong if nobody knows.",
  "urgency": 1, "source": "Where the gap showed up" }
```

`urgency` is 1 (ask first), 2 (ask soon) or 3 (good to know, the default).

## Progress and resume offers

Progress is private to each viewer. With the `db` and `user` capabilities, the page keeps it in `data/users/<user id>/progress` and mirrors it to `localStorage`. Without them, or after a failed write, it uses `localStorage` only. The Progress page says which mode is on.

To reset one learner, write `{ "resetAt": <epoch ms> }` to `data/users/<user id>/control`. Saved progress with an older marker is dropped, in the database and in the browser.

A resume offer gives one learner starting levels from an earlier session. Write it into that learner's own `progress` document, never into the page code:

```json
{ "resume": { "levels": { "o1": 2, "o2": 1 }, "line": "o", "focus": "o1" } }
```

Levels are capped at 3. `line` and `focus` are optional. That learner sees a choice between the offer and the placement. Questions tagged `resume` on that line then come back cold, the `open` one first.

## Writing rules

- American spelling. Sentence case. No em dashes and no semicolons: start a new sentence.
- Plain words and short sentences. Identifiers in backticks.
- No praise, no exclamation marks and no rhetorical questions in answers.
- Wrong options are real mistakes, never jokes.
- Check every correct answer against the source. When the source does not settle a point, make it an open question instead.
- Validate with `python3 -c "import json,sys; json.load(open(sys.argv[1]))" <file>`, then run the build.
- To polish prose without touching facts, run `scripts/extract_prose.py`, rewrite the extracted fields, and merge with `scripts/merge_prose.py`, which refuses any field that changed a number, code span, quotation or limit.
