# build-interactive-course

This skill helps your agent build an interactive course that teaches a person the context behind a project: a codebase, a system, a feature, a pull request, a document, or the output of another agent. The course is one HTML file that asks one question at a time, gives a narrower question after a miss, and raises a level only when the learner gets two different questions right. The agent builds it from the real sources and has a separate agent fact-check every answer before the learner sees it.

The skill works with any coding agent that can read and write files, run shell commands, and read the skill, such as Claude Code or Codex. It follows the open [Agent Skills](https://agentskills.io/) format.

## Before you begin

To use the skill, you need the following:

- Read access to the sources the course teaches, such as repositories and docs.
- Python 3.8 or later for the build, evidence, and prose scripts. They use only the standard library.
- Node.js with Playwright and Chromium for the learner test (`npm i -g playwright && npx playwright install chromium`).
- Any modern browser to open the course. The file needs no server, no network, and no hosting.
- Optional: Subagents, if your agent has them, so research, authoring, and fact-checking run in parallel. Without them the agent does those steps in sequence and runs the fact-check in a fresh session.
- Optional: A frontend design skill for the look, and the [`natural-voice`](../natural-voice) and [`improve-engagement`](../improve-engagement) skills for the prose pass.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `build-interactive-course`.

## Use the skill

The skill has two modes.

**Build mode** makes a course. The agent starts from whatever you give it, proposes five to nine concepts worth learning with a line on why each one matters, and lets you cut and add before it builds anything. It offers three sizes:

- A lesson: one stop with 8 to 12 questions, for one concept or one change.
- A module: one line of three to seven stops.
- A course: several lines, starting with what the owner decides.

**Tutor mode** picks up from a course you took. Bring the progress file or the save block from the course's Progress page. The agent reads your levels and the ideas you needed the answer for, then tutors you in the conversation on the weakest one, writes new questions for your weak stops and rebuilds the file, or both. It hands starting levels back as a file you load into the page.

The following requests trigger the skill:

- "I just inherited this service. Build me an interactive course so I can learn it."
- "Make a short lesson on what this pull request changes before I review it."
- "Quiz me on the migration plan the agent just wrote, with questions that make me reason through it."
- "Here's my save block from the course. Tutor me on the stops I'm weakest at."

For a one-off explanation, ask the question directly.

## How it works

The agent follows the process in [`SKILL.md`](SKILL.md). The following figure shows build mode and where tutor mode picks up:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/01-course-line-dark.webp">
  <img src="assets/01-course-line.webp" alt="Build mode drawn as a transit line. It starts at a terminus labeled the sources and ends at a terminus labeled course file. Research, author, and fact-check sit on three parallel tracks, one for each agent working at the same time, and the tracks merge back into one line. The stations after that are build and design, test, learner checkpoint, and voice pass. A green branch loops from the learner checkpoint back to build and design, because the learner's reactions change the look and the words. A blue branch runs from the course file down to tutor mode. A progress file comes back on it, and new questions go out.">
</picture>

Figure source: `assets/figures-source.html`. Open it in a browser. For the dark version, add `class="dark"` to its `<html>` element.

The steps are as follows:

1. **Concepts, intake, and preflight.** The agent proposes the concepts and a size, asks who the learner is and which decisions are theirs, and checks its tools and access.
1. **Research.** One pass per area of the system writes a dossier with `path:line` evidence for every claim.
1. **Authoring.** Scenario questions for each stop, with hints that never give the answer away.
1. **Fact-check.** An agent that didn't write the content checks every answer against the sources and reports each change.
1. **Build and design.** The agent builds `course.html` from the starter kit, chooses a component for each idea, and designs the look for the subject.
1. **Test and hand over.** A scripted learner opens the file from disk and takes the course. You get one file to send or host anywhere.
1. **Learner checkpoint and voice pass.** You take one placement and read five questions. Your reactions shape the look and the words before the full prose pass runs.

## What the course does

The starter kit gives every course the following behavior:

- A map of lines and stops, with a ring around each stop that fills as levels are earned.
- A short placement per line, then one question at a time, with a confidence call on every answer.
- A narrower question after each miss, the answer after three misses, and a re-test of the same idea from another angle.
- Levels 0 to 5 per stop. A level takes two different questions, one of them without warning. Surprise reviews can take a level back.
- Written answers checked against key points by the learner, or by the learner's own coding agent from a prompt the page copies.
- A final mixed assessment per line.
- Progress kept in the learner's browser, with a downloadable progress file to move it between devices and a plain-text save block for tutoring.

Questions come from a set of components, each of which forces a different kind of reasoning:

- `choice` and `multi`: pick the consequence that follows, or every statement that is true.
- `order`: rebuild a sequence where each step depends on the last.
- `bucket`: sort items by the property that matters.
- `text`: explain a mechanism in your own words.
- `reveal`: predict the output before it's shown.
- `replay`: step through a recorded sequence and call what happens next.
- `spot`: mark the lines in a code, config, or log block that are wrong or that prove a claim.
- `estimate`: commit to a number, then see where it falls against the real value.

When a subject has a natural interaction the set lacks, the agent designs a new component. [`references/components.md`](references/components.md) has the catalog and the rules a new component must meet.

## Run the scripts yourself

The following commands build a course, test it, check its evidence, and run the prose helpers:

```bash
python3 scripts/build_course.py COURSE_DIR --out OUT_DIR
node scripts/learner_test.mjs --file OUT_DIR/course.html --playwright PLAYWRIGHT_DIR --shots SHOTS_DIR
python3 scripts/check_evidence.py COURSE_DIR --root SOURCES_DIR
python3 scripts/extract_prose.py CONTENT_DIR EXTRACT_DIR
python3 scripts/merge_prose.py CONTENT_DIR REWRITE_DIR
```

Replace the following:

- `COURSE_DIR`: the folder that holds `course.json` and `content/`. To try the kit, use `assets/starter`.
- `OUT_DIR`: the folder to write `course.html` into.
- `PLAYWRIGHT_DIR`: a folder whose `node_modules` contains Playwright.
- `SHOTS_DIR`: where the test saves its screenshots. Without it, they go to `learner-shots/` in the current folder.
- `SOURCES_DIR`: the folder that evidence paths are relative to. Repeat `--root` for more than one. For the sample course, use `assets/starter`.
- `CONTENT_DIR`: the folder that holds the per-stop content files.
- `EXTRACT_DIR` and `REWRITE_DIR`: where the extracted text goes and where the rewritten text comes back from.

The learner test also accepts `--url` with a `file://` or `http://` address, and `--questions 160 --expect-final` for a longer pass that has to reach a final. The evidence check exits with status 1 when a cited file is gone or a cited line is past the end of its file, so it fits in a scheduled job that tells you when a course needs a refresh.

## Contents

The skill folder holds the following files:

- `SKILL.md`: build mode, tutor mode, refreshing a course, and the gotchas.
- `references/components.md`: the component catalog and how to invent a component.
- `references/content-schema.md`: the shape of `course.json` and of each stop's content file.
- `references/tutor-rules.md`: the tutoring rules, the save block, and the progress file.
- `references/agent-briefs.md`: brief templates for research, authoring, fact-checking, and relevance tagging.
- `references/design-and-state.md`: rules for the look and the words on the page, where progress lives, sharing, and checking the built file.
- `assets/starter/`: the page code, one file per component, a default stylesheet, and a small sample course with the made-up handbook its evidence points at.
- `scripts/build_course.py`: validates the content and builds `course.html`.
- `scripts/learner_test.mjs`: a scripted learner that takes the course in a browser.
- `scripts/check_evidence.py`: finds citations that no longer match the sources.
- `scripts/extract_prose.py` and `scripts/merge_prose.py`: pull out the text a learner reads, and put a rewrite back only where it kept every code name and number.
- `assets/01-course-line.webp`, `assets/01-course-line-dark.webp`, and `assets/figures-source.html`: the figure in this README, in light and dark, and its source.
