---
name: build-interactive-course
description: Builds a Socratic, game-like interactive course that teaches one person a system they now own, from the system's real sources. Researches the sources with evidence, writes scenario questions about decisions, has independent agents fact-check every answer, and ships a web page with levels, a placement, surprise reviews and private progress per learner, starting from a bundled kit. Use when the user asks for an interactive course, a learning game, quiz-based onboarding, a tutor page for a codebase, product or process, or wants to learn a system by being questioned on it and to share that with a team. Not for a one-off explanation, and not for a live tutoring chat with no page.
---

# Build interactive course

The course asks one question at a time and never lectures. A learner earns a level at each stop by getting two different questions right, one of them without warning. Every question comes from the system's real sources and is checked by an agent that did not write it.

Three things separate a course people finish from one they abandon:

- **It teaches decisions.** Coding agents read code. The owner decides, approves, refuses and checks. A fact belongs in a question only when knowing it changes one of those.
- **It is verified before the learner sees it.** A course that teaches one wrong fact about a production system costs more than no course.
- **It reads like a colleague.** Dense, correct text gets skipped.

**Done when:** the published page passes the learner test, every question has been fact-checked by an agent that did not write it, and the learner has taken one placement and reacted to both the look and the writing.

## Workflow

```
- [ ] 1. Intake: the learner, what they decide, the sources
- [ ] 2. Preflight: tools, access, approvals, watchers
- [ ] 3. Research dossiers with evidence
- [ ] 4. Spine: lines and stops, decision line first
- [ ] 5. Author content from a brief
- [ ] 6. Fact-check with different agents
- [ ] 7. Build on the starter kit and design the look
- [ ] 8. Test, publish, check the live page
- [ ] 9. Learner checkpoint, then the voice pass
- [ ] 10. Record where everything lives
```

This is multi-agent work. Steps 3, 5 and 6 fan out to subagents. Ask which model the user wants for them, and keep the judgment calls in the main session.

### 1. Intake

Find out, from the request or by asking:

- **The learner and the moment.** Their role, what they already know, and why now.
- **What they decide.** Ask "when agents write the code, which calls are still yours?" The answers become the first line of the course.
- **The sources.** Repositories, docs, runbooks, and whether the system can be run to capture real behavior.
- **Who else will take it.** That decides how progress is stored and shared.
- **How long it must stay true.** Leave countdowns, deadlines and people's departures out of the page. They read stale within days.
- **Earlier tutoring.** If the learner has a record of levels or misconceptions, it becomes a private resume offer, never page content.

### 2. Preflight

Check each tool before building on it: subagents, a headless browser, the publish target, read access to every source. Then:

- **Name the outward actions and get approval once:** live calls to a running system, screenshots of third-party tools, publishing.
- **Work from read-only copies** of the sources, at the default branch, so the course and the checks see the same code.
- **Keep briefs, scripts, content and reports in a folder that survives a restart.** Temp folders do not.
- **For long runs, watch usage and free disk.** When work pauses on a limit, say what stopped and what will not resume by itself.

### 3. Research dossiers

One agent per area of the system, four to six areas. Each writes a dossier with `path:line` evidence, verbatim excerpts, seeds for questions, and a list of things the sources cannot answer. Use the brief in [references/agent-briefs.md](references/agent-briefs.md).

Where the system can run, capture real behavior: real requests, traces, logs, the real interface. Label anything reconstructed. A capture taken through a proxy that buffers responses does not measure timing.

Note every doc that exists only on an unmerged branch. Evidence that cites it must say so.

### 4. Spine

Lay the course out as lines with four to ten stops each, in `course.json`.

- **The first line is about owning the system:** what nothing enforces, which changes must move together, what fails without an alert, which calls need a person, where judgment is needed, and how to check a claim.
- **Later lines cover the subject matter** in enough depth to follow an agent's explanation.
- **Tag every question** as `owner`, `useful` or `mechanics`. Mechanics are hidden by default. A question that only tests an identifier or the order of statements is mechanics.

### 5. Author content

One content file per stop, in the shape [references/content-schema.md](references/content-schema.md) defines. Give each authoring agent two or three stops and the authoring brief. The brief carries the rules that matter most:

- Every question is a scenario from the learner's seat, with an agent or a teammate in it.
- Each stop has at least two questions at every difficulty from 1 to 5 and one teach-back, or its upper levels cannot be earned.
- Primers, probes and `owner` lines never state or imply an answer.
- Every fact is checked against a source. What cannot be verified is left out and becomes an open question.
- The writer's voice rules go in the brief from the start. Rewriting 4,000 fields later costs more than writing them well once.

### 6. Fact-check

Give the content to agents that did not write it, with the fact-check brief. A cheaper model is fine here, because each claim is checked against a file. They fix in place and write a report with before and after for every change.

Back up the content first. Afterward, diff against the backup and confirm that no marked-correct answer changed without a line in a report. Claims the checkers could not confirm go on the open questions page.

### 7. Build and design

Copy `assets/starter/` into the working folder, write `course.json`, drop the content files in, and build:

```bash
python3 scripts/build_course.py <course_dir> --out <site_dir>
```

The build validates the content and prints every problem. Fix them all.

Then design the page. Load a frontend design skill before writing any style, and write the design plan it asks for. The kit's look is a placeholder. Take the visual idea from the subject's own vocabulary, the way a course that spoke of "tracks" and "stations" became a line map. Read [references/design-and-state.md](references/design-and-state.md) for the rules on labels, titles, storage and sharing.

### 8. Test and publish

```bash
node scripts/learner_test.mjs --url <preview URL> --playwright <dir with node_modules> --shots <dir>
```

The script takes the placement and answers about forty questions in every format. Look at its screenshots in light mode, dark mode and at phone width. After publishing, open the published page in a real browser and check it there. A local preview does not prove the live page.

### 9. Learner checkpoint, then voice

Ask the learner to take one placement and read five questions. Their reaction to the look and to the words is the test that counts, and it arrives early enough to act on.

Run the prose pass after that. Use the learner's own style rules, such as a `natural-voice` profile, and the `improve-engagement` skill when it is installed: one stop as a sample, a blind comparison, a fidelity check, then the rest. `scripts/extract_prose.py` pulls out only the text a learner reads, and `scripts/merge_prose.py` refuses any rewritten field that loses a code name or a number.

### 10. Record

Write down where the content, briefs, reports and build live, how to rebuild, what is unverified and what is still open. The next session starts from that note.

## Gotchas

- **A primer may teach a rule, and a question must then apply it.** The kit's sample course shows the line: its primers state the desk's rules, and its questions put a case in front of the learner. A question that asks the learner to repeat the primer tests nothing.
- **Primers give answers away.** In the first course built this way, three in four primers stated the answer to a question on the same idea. The fact-check brief looks for it by name.
- **So do "why this matters" lines.** About half of the `owner` lines stated the answer. They name a decision and nothing more.
- **Agents copy a brief's examples word for word.** One wrong example in a brief became the same wrong sentence in the course. Check every example against the source.
- **One learner's state leaks into the page.** Starting levels from an earlier session were written into the page code, where every visitor would have seen them. They belong in that learner's private record.
- **Seeded progress looks like a bug.** A learner who starts at carried-over levels sees a non-zero score before answering anything. Say so on the screen that offers it.
- **Unlabeled indicators get misread.** Five dots for difficulty were read as progress. Badges with no heading meant nothing. Label every one.
- **A highlighted default biases answers.** One filled button among three equal choices pulled answers toward it.
- **Slogans fail as titles.** Three headline attempts were rejected. A plain title that names the page was accepted at once.
- **View-only visitors cannot save.** On hosts with access levels, progress in a private record needs more than view access. The page falls back to the browser and should say so.
- **A stale tab can undo a reset.** Clear saved progress with a marker the page checks on load, not by deleting a record an open tab will write back.
- **Full-page screenshots can drop animated elements.** Check a viewport capture before chasing a missing line.
- **The local preview is not the live page.** Fonts, storage and the host's script rules differ. Always open the published page.
