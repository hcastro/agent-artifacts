# Strategic Code Design Skill

A custom agent skill for production code quality, correctness, code review, refactoring, API design, debugging, and maintainability.

The skill operationalizes design principles from John Ousterhout's *A Philosophy of Software Design* as reusable agent workflows. It is intentionally paraphrased and does not include book excerpts.

## Install

- For Claude.ai custom skills, upload `strategic-code-design.skill` or the source zip if your UI expects a zip archive.
- For Claude Code, place the `strategic-code-design/` folder under your user or project skills directory.

## Contents

- `SKILL.md`: trigger description and core workflow
- `references/principles.md`: detailed design principles
- `references/book-concept-map.md`: source-to-agent mapping for tuning and rationale
- `references/red-flags.md`: design-smell investigation guide
- `references/review-rubric.md`: PR review severity and templates
- `references/correctness-checklist.md`: correctness and testing checklist
- `references/design-it-twice.md`: design-alternative decision template
- `references/examples.md`: invented examples
- `scripts/complexity_scan.py`: optional heuristic static scanner
- `evals/evals.json`: draft test prompts for future evaluation, not included in packaged `.skill`

## Inspiration and attribution

This skill is inspired by ideas from:

**John K. Ousterhout, _A Philosophy of Software Design_, 2nd ed.**

This project is not affiliated with, endorsed by, or sponsored by John K. Ousterhout or Yaknyam Press.

The skill does not reproduce the book text. It translates general software design principles into agent-facing review workflows, checklists, and heuristics for code quality, correctness, maintainability, and refactoring.

Readers should buy and read the original book for the full treatment of these ideas.
