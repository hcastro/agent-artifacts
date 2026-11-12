---
name: build-interactive-course
description: Builds a Socratic, interactive course as one self-contained HTML file that teaches a concept, a topic, a technology or a codebase. Proposes the concepts worth learning, researches the sources with evidence, writes scenario questions that make the learner reason, has a separate agent fact-check every answer, and ships a page with levels, a placement, surprise reviews and interactive components such as predict-then-reveal, step-through replays, spot-the-line and estimates, with room to invent new ones. Sized as a lesson, a module or a full course. Also tutors in conversation from the progress file or save block the page exports, and adds questions for weak spots. Use when the user asks to be taught, quizzed or onboarded on a subject, a technology, a system or a codebase through a course, learning game, quiz or tutor page, or comes back with course progress. Not for a one-off explanation.
---

# Build interactive course

The course asks one question at a time and never lectures. A learner earns a level at each stop by getting two different questions right, one of them without warning. Every question comes from the real sources and is checked by an agent that did not write it. The result is one HTML file that opens from disk, with no server and no network.

Three things separate a course people finish from one they abandon:

- **It teaches what the learner will do with the subject.** For a codebase, that is the calls a person still makes when agents write the code: what to approve, refuse and check. For a technology, it is when to reach for it, how it fails, and how to tell a good result from a plausible one. For a concept, it is applying it and telling it apart from its look-alikes. A fact belongs in a question only when knowing it changes one of those.
- **It makes the learner reason.** Every question is an interaction that needs a commitment first: a prediction, a call, a marked line, a number. The catalog of components is in [references/components.md](references/components.md).
- **It is verified before the learner sees it.** A course that teaches one wrong fact costs more than no course.

**Done when:** `course.html` passes the learner test from disk, every question has been fact-checked by an agent that did not write it, and the learner has taken one placement and reacted to both the look and the writing.

## What you need

- Read access to the sources, and a shell.
- Python 3.8 or later for every script in `scripts/` except the learner test. They use only the standard library.
- Node.js with Playwright and Chromium for `scripts/learner_test.mjs`.
- Optional companions: a frontend design skill for the look, and a voice or style skill for the prose pass, such as `natural-voice` and `improve-engagement` from this repository.

## Pick the mode

- **Build mode** when the person wants a course, a lesson or a module made, or rebuilt.
- **Tutor mode** when a learner brings a progress file or a save block, says "resume from:", or asks to be tutored on a course that exists.

Both can happen in one session: tutor first, then add questions for the weak stops and rebuild.

## Build mode

```
- [ ] 1. Concepts and size: propose, let the person cut and add
- [ ] 2. Intake: the learner, what they will do with it, the sources
- [ ] 3. Preflight: tools, fixed copies of the sources, a durable folder
- [ ] 4. Research dossiers with evidence
- [ ] 5. Spine: lines and stops, the line on using the subject first
- [ ] 6. Author content from a brief
- [ ] 7. Fact-check by a different agent
- [ ] 8. Build on the starter kit, choose components, design the look
- [ ] 9. Test the file from disk, then hand it over
- [ ] 10. Learner checkpoint, then the voice pass
- [ ] 11. Record where everything lives
```

**Fan-out.** Steps 4, 6 and 7 fan out. Use subagents when you have them, and ask which model the person wants for them. Without subagents, do the same steps in sequence. Either way, run the fact-check in a fresh session or a separate agent process, so the checker has not seen the author's reasoning. Keep the judgment calls in the main session.

### 1. Concepts and size

Start from whatever the person gives: a topic, a concept, a technology, a codebase, or the sources for one, such as docs, a spec, papers or a book. Read enough of it to propose five to nine concepts worth learning. For each, write one line on why it matters and one on what it lets the learner do:

```
3. Renewal limits. Why: a refused renewal is the top desk complaint.
   Supports: telling a patron before the screen does whether a renewal will go through.
```

The person cuts and adds before anything is built. Then offer three sizes:

- **A lesson:** one stop, 8 to 12 questions, for one concept.
- **A module:** one line of three to seven stops.
- **A course:** several lines. The first is about what the learner will do with the subject.

### 2. Intake

Find out, from the request or by asking:

- **The learner and the moment.** Their role, what they already know, and why now.
- **What they will do with it.** For a codebase, ask "when agents write the code, which calls are still yours?" For a technology, ask what they will build with it, choose it over, or have to judge. For a concept, ask where they will apply it. The answers become the first line of the course.
- **The sources.** Repositories, docs, specs, papers, books and articles the person trusts. For a system, also whether it can be run to capture real behavior. When the person names only a topic, propose a short list of sources and get it approved before research starts.
- **How long it must stay true.** Leave countdowns, deadlines and people's departures out of the page. They read stale within days.
- **Earlier tutoring.** A record of levels or misconceptions becomes a progress file that learner loads, never page content.

### 3. Preflight

Check each tool before building on it: subagents if you plan to use them, a headless browser, read access to every source. Then:

- **Name the outward actions and get approval once:** live calls to a running system, screenshots of third-party tools.
- **Fix the sources in place,** so the course and the checks see the same text. Work from read-only copies of repositories at the default branch. Save web pages and other online sources as text snapshots in the working folder, each with its URL and the date it was saved, so research and the fact-check read the same words and need no network.
- **Keep briefs, scripts, content and reports in a folder that survives a restart.** Temp folders do not.
- **For long runs, watch usage and free disk.** When work pauses on a limit, say what stopped and what will not resume by itself.

### 4. Research dossiers

One pass per area of the subject, four to six areas. Each writes a dossier with evidence for every claim, verbatim excerpts, seeds for questions, and a list of things the sources cannot answer. Evidence takes one of the forms in [references/content-schema.md](references/content-schema.md#evidence). Use the brief in [references/agent-briefs.md](references/agent-briefs.md).

Where the subject is a system that can run, capture real behavior: real requests, traces, logs, the real interface. These make the best `reveal` and `replay` questions. Label anything reconstructed. A capture taken through a proxy that buffers responses does not measure timing.

In a repository, note every doc that exists only on an unmerged branch. Evidence that cites it must say so.

### 5. Spine

Lay the course out as lines with stops, in `course.json`.

- **The first line is about using the subject.** For a codebase, that is owning it: what nothing enforces, which changes must move together, what fails without an alert, which calls need a person, and how to check a claim. For a technology, it is choosing it, the ways it fails, and checking a result. For a concept, it is applying it to new cases and separating it from ideas that look the same.
- **Later lines cover the subject matter** in enough depth to follow an expert's or an agent's explanation.
- **Tag every question** as `owner`, `useful` or `mechanics`. An `owner` question changes what the learner will do, whatever the subject. Mechanics are hidden by default. A question that only tests a name, a date or the order of statements is mechanics.

### 6. Author content

One content file per stop, in the shape [references/content-schema.md](references/content-schema.md) defines. Give each author two or three stops and the authoring brief. The brief carries the rules that matter most:

- Every question is a scenario from the learner's seat. In a codebase course, an agent or a teammate is usually in it.
- Each stop has at least two questions at every difficulty from 1 to 5 and one teach-back, or its upper levels cannot be earned.
- Primers, probes and `owner` lines never state or imply an answer.
- Every fact is checked against a source, and every evidence line points at a source that was opened. What cannot be verified becomes an open question.
- The writer's voice rules go in the brief from the start. Rewriting 4,000 fields later costs more than writing them well once.

### 7. Fact-check

Give the content to an agent that did not write it, with the fact-check brief. A cheaper model is fine here, because each claim is checked against a source. It fixes in place and writes a report with before and after for every change.

Back up the content first. Afterward, diff against the backup and confirm that no marked-correct answer changed without a line in a report. Run `scripts/check_evidence.py` to catch citations that point nowhere. Claims the checker could not confirm go on the open questions page.

### 8. Build, choose components, design

Copy `assets/starter/` into the working folder, write `course.json`, drop the content files in, and build:

```bash
python3 scripts/build_course.py <course_dir> --out <out_dir>
```

The build validates the content, prints every problem and writes `<out_dir>/course.html`. Fix every error and read every warning.

Choose a component per idea by the reasoning the idea needs, using [references/components.md](references/components.md): `reveal` for predicting an outcome, `replay` for following a process, `spot` for finding the evidence, `estimate` for a sense of scale. When the subject has a natural interaction the catalog lacks, invent a component. The same file says how, and what it must pass.

Then design the page. Load a frontend design skill when one is installed, and write the design plan it asks for. The kit's look is a placeholder. Take the visual idea from the subject's own vocabulary, the way a course that spoke of "tracks" and "stations" became a line map. Read [references/design-and-state.md](references/design-and-state.md) for the rules on labels, titles, progress and sharing.

### 9. Test and hand over

```bash
node scripts/learner_test.mjs --file <out_dir>/course.html --playwright <dir with node_modules> --shots <dir>
```

The script opens the file from disk, takes the placement, answers about forty questions through every component, checks written answers both ways, downloads and loads progress, and fails on console errors, outside requests and sideways scroll at 390 px. Add `--questions 160 --expect-final` for a pass that reaches a final. Look at its screenshots at desktop and phone width, and open the file yourself in a real browser.

Hand over the one file. It can be sent or hosted anywhere, and each person's progress stays in their own browser.

### 10. Learner checkpoint, then voice

Ask the learner to take one placement and read five questions. Their reaction to the look and to the words is the test that counts, and it arrives early enough to act on.

Run the prose pass after that, with the learner's own style rules or a voice skill: one stop as a sample, a blind comparison, a fidelity check, then the rest. `scripts/extract_prose.py` pulls out only the text a learner reads, and `scripts/merge_prose.py` refuses any rewritten field that loses a code name or a number.

### 11. Record

Write down where the content, briefs, reports and build live, how to rebuild, what is unverified and what is still open. The next session starts from that note.

## Tutor mode

When a learner comes back with a progress file or a save block:

1. **Read where they stand:** levels, the target, the ideas they needed the answer for, and their recent misses. Both formats are in [references/tutor-rules.md](references/tutor-rules.md).
2. **Open the course content** for the weakest stop, so every question you ask is checked against the same sources.
3. **Then do one or both:**
   - **Tutor in conversation** on the weakest idea, under the rules in [references/tutor-rules.md](references/tutor-rules.md): one question at a time, a narrower question after a miss, the answer only after two or three misses and then a re-test from a new angle.
   - **Write new questions** for the weak stops, fact-check them as in step 7, tag the ones that test this learner's mistakes `misconception`, and rebuild the file.
4. **Hand levels back** as a save block with no `blob` line, or a progress file with a `resume` object, for the learner to load. Never write one learner's levels into the content or the page.

## Refresh a course

When the sources change, start with:

```bash
python3 scripts/check_evidence.py <course_dir> --root <sources_dir> [--root <another>]
```

It lists every `path:line` citation whose file is gone or whose line is past the end of the file, and exits 1 when anything is stale. It cannot open a book or a live page, so it lists every other citation for a person or an agent to recheck by hand. A clean run means the cited lines exist, not that they still say the same thing, so re-read the cited lines for every changed file. Fix or drop the affected questions, fact-check them again, and rebuild.

For a web page, save a new snapshot next to the old one and compare the two before trusting the course.

## Scripts

Run these. Read them only to change them.

| Script | What it does |
|---|---|
| `scripts/build_course.py` | Validates a course and writes the single `course.html`. |
| `scripts/learner_test.mjs` | Takes the course in a headless browser, from `file://` or `http://`, and reports every error. |
| `scripts/check_evidence.py` | Finds file citations that no longer match the sources, and lists the others for a recheck by hand. |
| `scripts/extract_prose.py`, `scripts/merge_prose.py` | Pull out the text a learner reads for a rewrite, and merge back only safe changes. |

## Gotchas

- **A primer may teach a rule, and a question must then apply it.** The sample course shows the line: its primers state the desk's rules, and its questions put a case in front of the learner. A question that asks the learner to repeat the primer tests nothing.
- **Primers give answers away.** In the first course built this way, three in four primers stated the answer to a question on the same idea. The fact-check brief looks for it by name.
- **So do "why this matters" lines.** About half of the `owner` lines stated the answer. They name a decision and nothing more.
- **Agents copy a brief's examples word for word.** One wrong example in a brief became the same wrong sentence in the course. Check every example against the source.
- **One learner's state leaks into the page.** Starting levels from an earlier session were once written into the page code, where every visitor would have seen them. They belong in that learner's progress file.
- **Seeded progress looks like a bug.** A learner who starts at carried-over levels sees a non-zero score before answering anything. The screen that offers them says why.
- **Unlabeled indicators get misread.** Five dots for difficulty were read as progress. Badges with no heading meant nothing. Label every one.
- **A highlighted default biases answers.** One filled button among three equal choices pulled answers toward it.
- **Slogans fail as titles.** Three headline attempts were rejected. A plain title that names the page was accepted at once.
- **A reveal that hides with CSS is not hidden.** Keep the answer out of the page until the question settles, as the built-in components do.
- **Files opened from disk can share storage.** Some browsers give every local file one storage area, so two courses with one `storage_key` overwrite each other.
- **Full-page screenshots can drop animated elements.** Check a viewport capture before chasing a missing line.
- **An open tab keeps the old file.** Reload after every rebuild before judging a fix.
