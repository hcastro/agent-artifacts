# Agent briefs

Templates for the three fan-out steps. Fill in the capitalized placeholders. Every brief ends with the same hard limits, because an agent that edits a source or starts a service can do damage that outlasts the course.

Hand each brief to a subagent when the agent has them. Without subagents, work through the briefs in sequence yourself, one area or two or three stops at a time. Run the fact-check brief in a fresh session or a separate agent process either way, so the checker has not seen the author's reasoning.

## Contents

- Research dossier
- Authoring
- Fact-check
- Relevance tagging
- Hard limits

## Research dossier

One agent, or one pass, per area. Give it the area, the source paths and the output path.

```
You are researching AREA of SYSTEM for a course that will teach its new owner.
Read the sources at SOURCE_PATHS. They are read-only copies of the default branch.

Write a dossier to DOSSIER_PATH with these sections:
1. How it works: the mechanism, in the order things happen, each claim followed by
   its evidence as path:line.
2. Verbatim excerpts: the 10 to 20 pieces of code, config or log output a learner
   should see, each with its path and line range.
3. What nothing enforces: checks that look like they exist and do not, settings
   that must change together across repositories, failures that raise no alert,
   steps that depend on one person.
4. Question seeds: 20 to 30 situations an owner could face, each with the fact
   that settles it and where that fact lives.
5. What the sources cannot answer: questions for the person who built it.

Rules: quote, do not paraphrase, when the wording matters. Say when a document
exists only on a branch that is not merged. Say when two sources disagree and
which one the running code follows. Do not guess.
```

## Authoring

Two or three stops per agent or per pass.

```
You are writing course content for STOPS of COURSE. Read the schema first:
SCHEMA_PATH, then the component catalog: COMPONENTS_PATH. Read the dossiers at
DOSSIER_PATHS to find things fast. When a dossier
and a source disagree, the source wins.

The principle: the learner works with coding agents. Do not drill what an agent can
read off a file: function names, line numbers, parameter values, the order of
statements. A fact belongs in a question only when knowing it changes what the
learner decides, approves, refuses or checks.

What we know about the learner: LEARNER_NOTES.

Per stop, write CONTENT_PATH/<stop>.json with:
- 14 to 16 questions: at least two at each difficulty from 1 to 5, one of the
  difficulty 5 questions of type "teach", and at least three "text" questions.
  Choose each question's format by the reasoning its idea needs, from the
  component catalog. Use a closed format for most questions at difficulty 4 and 5.
  If the subject has a natural interaction no component covers, say so in your
  final message instead of forcing a format.
- 5 or 6 ideas, each tested by at least two questions from different angles, each
  with a primer.
- 6 reference cards with verbatim excerpts, 4 open questions, 2 finals.

Rules:
- Every question is a scenario from the learner's seat, with an agent or a teammate
  in it where that is natural. Test the decision, not the identifier.
- Every question and final has an "owner" field: one sentence starting "So you can"
  that names a decision. It must not state the answer.
- A primer says what the idea is and where to look. It does not hand over a fact a
  question asks for. Probes and wrong-option probes point at one thing to look at
  and never state or imply the answer.
- Every evidence line is a real path:line you opened. Evidence that exists only on
  an unmerged branch says so.
- If you cannot verify a claim, leave it out and write it as an open question.
- Voice: VOICE_RULES.

After writing, validate the JSON, then re-read each question against the source
once and fix what you cannot back.

Final message: counts per file, your three strongest questions, and every claim you
wanted to use and could not verify.
```

## Fact-check

Different agents from the ones that wrote the content, or a fresh session that has not seen the authoring.

```
You are fact-checking course content against its sources. Wrong answers here teach
a person wrong facts about a production system. The content was written by other
agents who checked their own work. Assume nothing is verified.

Files: CONTENT_FILES. Schema: SCHEMA_PATH. Sources: SOURCE_PATHS.

For every question and final, check:
1. The marked-correct answer, the order, the bucket for each item, or the rubric's
   required points.
2. Every detail of the answer text: names, numbers, paths, ordering, defaults.
3. Each evidence line points at a file that exists and says what the line claims.
4. Every wrong option is wrong. Reword one that is defensible, keeping its id.
5. Every multi-select has exactly the right set.
6. No giveaways: no primer, probe, wrong-option probe or "owner" line states or
   plainly implies the answer to a question on the same idea.
7. Where a question says something is not enforced, not monitored or not checked,
   look for the enforcement in every source before accepting it.
Then check the finals, that each card's excerpt matches its source word for word,
and the premise of each open question.

Fix problems in place. Keep every id and the schema. Change only what is wrong,
ambiguous or a giveaway. If you cannot verify a claim either way, leave it and
list it as unverified.

Write one report per stop to REPORT_PATH/<stop>.md: counts, then one entry per
change with id, field, before, after and the path:line that proves it, then the
unverified list.

Final message: per stop, questions changed and other items changed, the three most
important corrections, and what a person should look at.
```

## Relevance tagging

Use it on content that was written before the decision principle, or on any stop that leans on recall.

```
Classify every question in CONTENT_FILES. Write TAGS_PATH as one JSON object keyed
by question id: {"relevance": "owner" | "useful" | "mechanics", "owner": "So you
can ...", "why": "at most 15 words"}.

owner: knowing this changes what the learner decides, approves, refuses or checks.
useful: system shape the learner needs to follow an explanation or read a trace.
mechanics: recall of detail an agent reads off the file, with no decision attached.

Judge a question by what it makes the learner do, not by its topic. Be strict.
Read the full answer before you judge.
```

Put the tags into each question's `rel` field. The build keeps a level reachable by bringing back the hardest hidden questions when hiding mechanics would leave fewer than two at a difficulty.

## Hard limits

End every brief with these:

```
Read-only everywhere except the files this brief tells you to write. Change
nothing in any repository or working copy. Start no services, run no tests or
apps, make no network or cloud calls. Do not copy repositories. Never print
secrets. Write files with your file tools, and keep scratch files in SCRATCH_PATH
and delete that folder before you finish.
```
