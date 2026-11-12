# build-interactive-course

This skill helps your agent build an interactive course that teaches one person a system they now own. The course is a web page that asks one question at a time, gives a narrower question after a miss, and raises a level only when the learner gets two different questions right. The agent builds it from the system's real sources and has other agents fact-check every answer before the learner sees it.

Use it for a codebase, a product, an operations process, or anything else with sources an agent can read.

## Before you begin

To use the skill, you need the following:

- An agent that can run subagents. Research, authoring, and fact-checking each fan out to several.
- Read access to the sources the course teaches, such as repositories and docs.
- Python 3.8 or later for the build and prose scripts. They use only the standard library.
- Node.js with Playwright and Chromium for the learner test (`npm i -g playwright && npx playwright install chromium`).
- A place to publish a static page. The starter kit uses private per-visitor storage when the host offers it, and the browser's local storage otherwise.
- Optional: A frontend design skill for the look, and the [`natural-voice`](../natural-voice) and [`improve-engagement`](../improve-engagement) skills for the prose pass.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `build-interactive-course`.

## Use the skill

Ask for a course, a learning game, or to be taught a system through questions. The following requests trigger the skill:

- "I just inherited this service. Build me an interactive course so I can learn it."
- "Make a quiz-based onboarding for our deploy process that new engineers can take on their own."
- "Turn these four repositories into a course I can share with my team."

For a one-off explanation, ask the question directly. For tutoring in the conversation with no page, use a Socratic tutor skill.

## How it works

The agent follows the process in [`SKILL.md`](SKILL.md). The following figure shows the pipeline:

![A dashed box for the sources leads into seven numbered steps. The top row runs left to right: research, author, and fact-check. The bottom row runs right to left: build and design, test and publish, learner checkpoint, and voice pass. A dashed edge runs from the learner checkpoint back to build and design, labeled with the learner's reactions changing the look and the words.](assets/01-pipeline.webp)

Diagram source: `assets/diagrams-source.html`, rendered with the `doc-diagrams` skill.

The steps are as follows:

1. **Intake and preflight.** The agent asks who the learner is and which decisions are theirs, checks its tools and access, and gets approval for anything that reaches outside the workspace.
1. **Research.** One agent per area of the system writes a dossier with evidence for every claim.
1. **Spine.** The course is laid out as lines with stops. The first line covers what the owner decides. Questions that only test recall of code detail are tagged and hidden by default.
1. **Authoring.** Agents write scenario questions for each stop, with hints that never give the answer away.
1. **Fact-check.** Agents that didn't write the content check every answer against the sources and report each change.
1. **Build and design.** The agent builds the page from the starter kit, then designs the look for the subject.
1. **Test and publish.** A scripted learner takes the placement and answers about forty questions. The agent checks the published page in a real browser.
1. **Learner checkpoint and voice pass.** You take one placement and read five questions. Your reactions shape the look and the words before the full prose pass runs.

## What the course does

The starter kit gives every course the following behavior:

- A map of lines and stops, with a ring around each stop that fills as levels are earned.
- A short placement per line, then one question at a time in five formats: single choice, multiple choice, ordering, sorting into groups, and written answers.
- A narrower question after each miss, the answer after three misses, and a re-test of the same idea from another angle.
- Levels 0 to 5 per stop. A level takes two different questions, one of them without warning. Surprise reviews can take a level back.
- A final mixed assessment per line.
- Progress that is private to each visitor.

## Run the scripts yourself

The following commands build a course, test it, and run the prose helpers:

```bash
python3 scripts/build_course.py COURSE_DIR --out SITE_DIR
node scripts/learner_test.mjs --url PREVIEW_URL --playwright PLAYWRIGHT_DIR --shots SHOTS_DIR
python3 scripts/extract_prose.py CONTENT_DIR OUT_DIR
python3 scripts/merge_prose.py CONTENT_DIR REWRITE_DIR
```

Replace the following:

- `COURSE_DIR`: the folder that holds `course.json` and `content/`.
- `SITE_DIR`: the folder to write the page into.
- `PREVIEW_URL`: the address of the built `preview.html` on a local server.
- `PLAYWRIGHT_DIR`: a folder whose `node_modules` contains Playwright.
- `SHOTS_DIR`: where the test saves its screenshots. Without it, they go to `learner-shots/` in the current folder.
- `CONTENT_DIR`: the folder that holds the per-stop content files.
- `OUT_DIR` and `REWRITE_DIR`: where the extracted text goes and where the rewritten text comes back from.

## Contents

The skill folder holds the following files:

- `SKILL.md`: the ten-step process and the gotchas.
- `references/content-schema.md`: the shape of `course.json` and of each stop's content file.
- `references/agent-briefs.md`: brief templates for research, authoring, fact-checking, and relevance tagging.
- `references/design-and-state.md`: rules for the look, the words on the page, storage, sharing, resets, and resumes.
- `assets/starter/`: the page code, a default stylesheet, and a small sample course.
- `scripts/build_course.py`: validates the content and builds the page.
- `scripts/learner_test.mjs`: a scripted learner that takes the course in a browser.
- `scripts/extract_prose.py` and `scripts/merge_prose.py`: pull out the text a learner reads, and put a rewrite back only where it kept every code name and number.
- `assets/01-pipeline.webp` and `assets/diagrams-source.html`: the figure in this README and its source.
