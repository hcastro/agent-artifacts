# Question components

Every question format is a component. A component draws the input, grades a closed answer, and shows what it needs to once the question settles. The learn loop does everything else, so narrower questions, attempts, confidence calls, re-tests, challenges, the teach-back and levels work the same for every format.

Choose a component per idea by the reasoning the idea needs, not by variety. When the subject has a natural interaction the catalog lacks, design a new component. That is part of the job, not an extra.

## Contents

1. [Choosing a component](#choosing-a-component)
2. [choice](#choice)
3. [multi](#multi)
4. [order](#order)
5. [bucket](#bucket)
6. [text](#text)
7. [reveal](#reveal)
8. [replay](#replay)
9. [spot](#spot)
10. [estimate](#estimate)
11. [Inventing a component](#inventing-a-component)

## Choosing a component

Start from what the learner has to do in their head:

| The idea needs the learner to | Use |
|---|---|
| Pick the one consequence that follows | `choice` |
| See that several things are true at once | `multi` |
| Rebuild a sequence where each step depends on the last | `order` |
| Tell kinds of things apart | `bucket` |
| Explain a mechanism or a tradeoff in their own words | `text` |
| Predict an outcome before seeing it | `reveal` |
| Follow a process over time and call each turn | `replay` |
| Find the evidence in real code, config or logs | `spot` |
| Hold a sense of scale: how long, how many, how much | `estimate` |

Every component follows the same rule: the learner commits before anything that could give the answer away is shown.

## choice

**Reasoning it forces.** Separating the right consequence from plausible mistakes.

**When to use it.** The default for one clear answer. Write wrong options that a smart learner would pick, each with its own narrower question.

**Fields.** `options`: 3 to 6, exactly one with `correct: true`. Each wrong option has a `probe`.

```json
{ "format": "choice",
  "options": [
    { "id": "a", "text": "The checkout goes ahead.", "correct": true },
    { "id": "b", "text": "The checkout is blocked.", "probe": "Find the dollar amount in the block rule. Is $6.50 above it?" }
  ] }
```

**Grading.** Right when the correct option is picked. A wrong pick shows that option's `probe`.

**Keyboard and small screens.** Options are buttons in a radio group. Tab reaches them, and the letter keys A to F pick one. Options stack in one column at any width.

## multi

**Reasoning it forces.** Checking each claim on its own instead of stopping at the first true one.

**When to use it.** Two or more statements are true and the learner tends to stop early, or to accept a half-true one.

**Fields.** `options`: 4 to 6, two or more correct. Give every option a `probe`.

```json
{ "format": "multi",
  "options": [
    { "id": "a", "text": "Taking all six goes one over the limit.", "correct": true, "probe": "Add 20 and 6. Compare with 25." },
    { "id": "b", "text": "The DVDs break the DVD limit.", "probe": "Count the DVDs after checkout. What is the DVD limit?" }
  ] }
```

**Grading.** All or nothing. A wrong pick shows its probe. With no wrong pick, the probe of a missed right option shows.

**Keyboard and small screens.** Checkbox buttons. Tab and the letter keys toggle them. One column.

## order

**Reasoning it forces.** Seeing why each step has to come before the next.

**When to use it.** Only when the order is forced. If two steps could swap, use another format.

**Fields.** `items`: 3 to 7 strings, written in the correct order. The page shuffles them.

```json
{ "format": "order", "items": ["Find the account", "Read the blocks", "Scan each item", "Hand over the receipt"] }
```

**Grading.** Right when every item is in place. After the question settles, the list shows the correct order.

**Keyboard and small screens.** Each item has Move up and Move down buttons, so nothing needs dragging. Items wrap their text at 390 px.

## bucket

**Reasoning it forces.** Classifying by the property that matters, not by surface features.

**When to use it.** The learner has to tell kinds apart, such as what blocks and what does not.

**Fields.** `buckets`: 2 to 6 `{ "id", "label" }`. `items`: 4 to 8 `{ "text", "bucket", "why" }`.

```json
{ "format": "bucket",
  "buckets": [{ "id": "d7", "label": "7 days" }, { "id": "d21", "label": "21 days" }],
  "items": [{ "text": "A boxed set of DVDs", "bucket": "d7", "why": "A boxed set is still a DVD." }] }
```

**Grading.** Right when every item is in its bucket. A miss says how many are in place. Each `why` shows after the question settles.

**Keyboard and small screens.** Each item has one button per bucket, in a row that wraps.

## text

**Reasoning it forces.** Producing an explanation from memory, which no option list can.

**When to use it.** Mechanisms, tradeoffs, the teach-back and every final. It is also the fallback for any question whose component is missing or cannot use its data.

**Fields.** `rubric`: `must` (2 to 5 points), `pass` (how many are needed), optional `misconceptions`.

```json
{ "format": "text",
  "rubric": { "must": ["An expired card blocks on its own.", "Renewal needs proof of address."], "pass": 2,
    "misconceptions": [{ "claim": "Says a clean account can borrow.", "probe": "Does a clean account clear all three blocks?" }] } }
```

**Grading.** The written-answer path. By default the learner ticks the key points their answer made. A pass counts as "with a nudge", and a fail gives the answer away. With "Check with my agent", the page copies a prompt that holds the question, the answer, the rubric and grading instructions. The learner pastes it into any coding agent, then reports "Got it" or "Not yet". "Not yet" counts as a miss and the learner revises. A first-attempt "Got it" counts as a first-try pass.

**Keyboard and small screens.** A plain text area with a word count.

## reveal

**Reasoning it forces.** Predicting an outcome before seeing it, which exposes a wrong mental model at once.

**When to use it.** Anything with an input and an output: a command and what it prints, a diff and its test result, a request and its response, a config change and the behavior that follows.

**Fields.** `block`: `kind`, `label`, `shown`, `hidden`, optional `hidden_label`. Then either `options` (one correct, 2 to 6) or a `rubric` for a written prediction.

```json
{ "format": "reveal",
  "block": { "kind": "log", "label": "Desk screen", "shown": "> renew 31207-0088\n  renewals   2 used",
    "hidden": "  result     refused: renewal limit reached", "hidden_label": "What the screen printed" },
  "options": [
    { "id": "a", "text": "Refused, because both renewals are used", "correct": true },
    { "id": "b", "text": "Renewed for 21 days", "probe": "How many renewals does an item get?" }
  ] }
```

**Grading.** Like `choice`, or the written-answer path when there are no options. The hidden part is not in the page until the question settles, so it opens with the answer, never after a miss.

**Keyboard and small screens.** Same as `choice` or `text`. The block scrolls sideways inside itself, never the page.

## replay

**Reasoning it forces.** Following a process over time and calling what happens at each turn, the way an owner reads a trace or an incident.

**When to use it.** Request traces, deploys, incidents, a shift, a conversation between agents, any recorded sequence where the interesting part is what comes next.

**Fields.** `steps`: 2 to 20 `{ "label", "detail", "time" }`. A step with `pause` is held back: when the replay reaches it, the learner calls what happens next from `pause.options` (one correct, 2 to 6), and the step plays once the call is right. At least one step needs a `pause`.

```json
{ "format": "replay",
  "steps": [
    { "time": "8:45", "label": "Book drop opened", "detail": "Twelve items came in on Sunday." },
    { "time": "8:46", "label": "Check-in date set to Saturday",
      "pause": { "prompt": "Before the first scan, what does the volunteer do?", "options": [
        { "id": "a", "text": "Set the check-in date to Saturday", "correct": true },
        { "id": "b", "text": "Scan right away", "probe": "Which days would today's date count as late?" } ] } },
    { "time": "9:00", "label": "Desk opens" }
  ] }
```

**Grading.** Each call goes through the normal submit with a confidence call. A wrong call is a miss with that option's `probe`. A right call that has more calls after it returns `{ next: true }`: no attempt is used and the replay plays on. The question passes when the last call is right. Three misses across all calls give the rest away.

**Keyboard and small screens.** Next step is a button, so Tab and Enter play the replay. Calls use the option list, with the letter keys. The timeline is a line of dots that scales to any width, with a marker on the current step and a text position such as "Step 2 of 7, 8:46".

## spot

**Reasoning it forces.** Finding the evidence in the real code, config or log instead of recalling a rule about it.

**When to use it.** A config with one bad value, a log that proves which step failed, a diff with the line that breaks a rule, a receipt or record with a wrong field.

**Fields.** `block`: `kind`, `label`, `body` as one string of 2 to 40 lines. `lines`: the 1-based line numbers that make up the answer. Optional `line_probes` (a narrower question when a given wrong line is marked) and `line_notes` (shown after the question settles).

```json
{ "format": "spot",
  "block": { "kind": "log", "label": "Checkout receipt", "body": "Date  the 3rd\nThe Long Field (book)  due the 24th\nCoastline (DVD)  due the 17th" },
  "lines": [3],
  "line_probes": { "2": "Count 21 days on from the 3rd." },
  "line_notes": { "3": "A DVD goes out for 7 days, so this should read the 10th." } }
```

**Grading.** Right when the marked set equals `lines`. A miss shows the probe for the first wrongly marked line and says whether lines are extra or missing, without saying which.

**Keyboard and small screens.** The block is a multi-select list box. Tab focuses it, the arrow keys, Home and End move, and Space or Enter marks a line. Long lines scroll sideways inside the block. Keep lines under about 60 characters so a phone shows most of each one.

## estimate

**Reasoning it forces.** A sense of scale. An owner who thinks a job takes seconds when it takes minutes makes different calls.

**When to use it.** Durations, counts, sizes, costs, rates, anything where being off by ten times is the real mistake.

**Fields.** `value`, `range` (`[low, high]`, holding `value`), `unit`, optional `scale` (`[min, max]` for the reveal), `decimals`, `probe_low` and `probe_high`.

```json
{ "format": "estimate", "unit": "dollars", "value": 27.5, "range": [27.5, 27.5], "decimals": 2, "scale": [0, 40],
  "probe_high": "A DVD builds up $1.00 a day. Does it keep building for all 15 days?",
  "probe_low": "Did you count all four items?" }
```

**Grading.** Right when the number falls inside `range`. A miss shows `probe_low` or `probe_high` and says which side of the range the guess fell. After the question settles, a scale shows the range, the real value and every guess.

**Keyboard and small screens.** One text input that accepts "1,200", "$27.50" or "27.5". Scale labels near either end anchor to that end so they stay on screen at 390 px.

## Inventing a component

A component is one file in `js/components/`. The build picks up every file there, in name order, and accepts its name as a `format`. Copy the built-in component closest to the idea as a start.

```js
Course.components.register('name', {
  render(q, api),        // builds the input UI inside api.el, calls api.ready(answer) when the learner can submit
  grade(q, answer),      // returns { ok, probe } for closed formats, or defers to the written-answer path
  reveal(q, el, result)  // optional: what to show after the answer is settled
});
```

The details:

- **`render(q, api)`** draws into `api.el`. Call `api.ready(answer)` whenever the answer changes, and `api.ready(null)` while nothing can be submitted. `api` also carries the helpers `h`, `md`, `inline`, `icon`, `block` (a code or log block), `options` (a shuffled option list) and `tick` (the click sound).
- **`grade(q, answer)`** returns `{ ok, probe, hint }`. `probe` is a narrower question for this miss, and `hint` is one short factual line, such as "3 of 5 are in place". Return `{ written: true }` to send the answer to the written-answer path, which grades against `q.rubric`. Return `{ next: true }` when the answer was right and the component has another call to ask for in the same question, as `replay` does.
- **`reveal(q, el, result)`** runs once the question settles. `result.out` is `clean`, `helped` or `told`. `result.answer` is the last answer and `result.answers` holds every one. The loop has already disabled the buttons and inputs in `el`, and adds the class `frozen`, so a component with its own controls checks for it.
- **Optional members.** `update(q, el, result)` runs after a graded attempt that leaves the question open. `written(q)` returns true when the question is answered in writing. `usable(q)` returns false when the data is missing. `empty` is the message shown when the learner submits with nothing ready.
- **`autoAnswer(q, el, right)`** answers through the component's own controls, by clicking its buttons or setting its input and firing an `input` event, so the answer flows through `api.ready` like a learner's. `right` false gives a wrong answer. It may return a promise. The learner test calls it through `Course.Learn.autoAnswer(right)`, which looks up the current question's component and calls its `autoAnswer`. A component without it fails the test.

A new component must meet these rules:

1. **The learner commits before anything is revealed.** Nothing that gives the answer away is in the page until `reveal` runs. Do not hide it with CSS. Add it then.
2. **The result can be graded by code or by the written-answer path.** If code cannot judge it, return `{ written: true }` and give the question a `rubric`.
3. **Feedback points at evidence.** A probe names one concrete thing to look at, count or compare. The reveal shows where the answer came from.
4. **It works by keyboard and at 390 px.** Every control is a real button or input, or a widget with arrow-key support. Nothing scrolls the page sideways. Wide content scrolls inside its own box.
5. **It has a `text` fallback when the data is missing.** Write `usable(q)` so a question with broken data is asked as text, and give custom-format questions a `rubric` so that fallback can be checked. The build warns when one is missing.
6. **It passes the learner test.** Give it `autoAnswer`, add at least one question in that format, and run `scripts/learner_test.mjs`. The test asks one question of each built-in format by id. For a new format, ask it in the console with `Course.Learn.askById('<id>')` and check it at 390 px.

Three examples of subjects and a component one might invent for them:

- **A message queue's retry policy: `backoff`.** The learner drags or types the delay before each of five retries, and the reveal draws the real schedule against theirs on a time axis. Graded by code: each delay within a tolerance.
- **A permission model: `grant`.** A grid of roles by actions. The learner ticks the cells a role should have for a given task, and the reveal marks the cells that would leak access. Graded on the exact set, like `spot`.
- **A pull request an agent wrote: `review`.** The learner reads a diff, picks the comment they would leave on one line, and writes why. The line is graded by code and the why goes to the written-answer path, by returning `{ written: true }` once the line is right.
