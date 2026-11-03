# strategic-code-design

This skill gives Claude a set of design lenses for writing, reviewing, refactoring, and debugging code. It favors deep modules, information hiding, and simple error models, and it rates review findings on a fixed severity scale.

The skill turns design principles from John Ousterhout's *A Philosophy of Software Design* into agent workflows.

## When to use it

Use the skill in the following situations:

- You design or refactor a module, API, error model, or data boundary.
- You weigh two designs against each other.
- A quick fix might spread one rule across many callers.
- A bug fix needs to repair the invariant that let the bug through.
- You want to know whether code is too complex, too shallow, or leaks its internals.
- A code review needs a design rubric with severity levels.

## Before you begin

You need an agent that can read files and run tests. The skill calls no outside services. The optional scanner needs Python 3.8 or later and uses only the standard library.

## Install the skill

To install the skill for Claude Code, clone the repository and link the skill into your skills folder:

```bash
git clone https://github.com/hcastro/agent-artifacts.git
mkdir -p ~/.claude/skills
ln -s "$PWD/agent-artifacts/skills/strategic-code-design" ~/.claude/skills/strategic-code-design
```

The link keeps the skill current when you run `git pull` in the clone. For other install locations, see [Install a skill](../../README.md#install-a-skill).

## How it works

[`SKILL.md`](SKILL.md) holds four workflows. Claude picks the one that fits the task:

- **Change.** Claude maps the current design, writes the correctness contract (inputs, outputs, invariants, and failure behavior), and tests the change against design pressure. For a change to an interface or module boundary, it sketches two designs and picks the simpler one.
- **Review.** Claude checks correctness first, then design. Each finding carries evidence, risk, and a fix, rated Blocker, High, Medium, or Low. The review ends with a verdict of Approve, Needs changes, or Block. The template is in [`references/review-rubric.md`](references/review-rubric.md).
- **Refactor.** Claude sets up a safety net of tests, names the design problem, picks a narrow seam, and refactors in small steps that keep behavior the same.
- **Debug.** Claude finds the broken invariant or hidden assumption, fixes it where it belongs, and adds a regression test.

The reference files hold the detail. Claude reads each one only when the task needs it.

## Example requests

The following requests trigger the skill:

- "Review this PR. It adds `sendInvoice(invoice, dryRun, skipValidation)` and passes the flags through three layers to the repository."
- "Expired coupons are sometimes accepted at checkout. Coupon dates are checked in the checkout endpoint, the admin preview endpoint, and a background job. Propose a fix."
- "Design an API for importing user records from CSV. It has to normalize emails, handle duplicate rows, report invalid rows, and serve both a web upload and a nightly sync."

## Run the scanner

The scanner flags places worth a closer look in a large review, such as boolean mode parameters, pass-through layers, broad exception handlers, and repeated blocks. Its findings are leads to inspect. They don't prove a defect.

To scan a file or directory, run the script from the skill's folder. Replace `PATH` with the file or directory to scan:

```bash
python3 scripts/complexity_scan.py PATH            # Markdown report
python3 scripts/complexity_scan.py PATH --json     # machine-readable
```

The script exits with an error if the path holds no supported source files.

## Contents

The skill folder holds the following files:

- `SKILL.md`: trigger description and core workflows
- `references/principles.md`: detailed design principles
- `references/book-concept-map.md`: how each part of the book maps to agent behavior, for tuning and rationale
- `references/red-flags.md`: design-smell investigation guide
- `references/review-rubric.md`: PR review severity levels and output template
- `references/correctness-checklist.md`: correctness and testing checklist
- `references/design-it-twice.md`: design-alternative decision template
- `references/examples.md`: invented examples
- `scripts/complexity_scan.py`: optional heuristic static scanner
- `evals/evals.json`: draft test prompts

## Inspiration and attribution

This skill is inspired by ideas from:

**John K. Ousterhout, _A Philosophy of Software Design_, 2nd ed.**

This project is not affiliated with, endorsed by, or sponsored by John K. Ousterhout or Yaknyam Press.

The skill does not reproduce the book text. It translates general software design principles into agent-facing review workflows, checklists, and heuristics for code quality, correctness, maintainability, and refactoring.

For the full treatment of these ideas, read the book.
