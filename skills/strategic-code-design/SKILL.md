---
name: strategic-code-design
description: Guides production code implementation, review, refactoring, debugging, API design, and architecture decisions using low-complexity, deep-module, information-hiding design principles. Use whenever the user asks to write or change code, review a PR or diff, improve correctness, simplify code, reduce bugs, design modules or APIs, or make a quick fix that could affect maintainability.
compatibility: Works with code-editing agents that can inspect files and run tests. No external network access required.
---

# Strategic Code Design

Use this skill to keep code changes correct, easy to reason about, and cheaper to modify later. The governing idea is: **working code is necessary but not sufficient**. A good answer should preserve or improve the system's ability to absorb future changes safely.

This skill operationalizes the design philosophy from John Ousterhout's *A Philosophy of Software Design* into agent workflows. It does not require quoting or reproducing the book. Use the concepts as lenses for code quality, correctness, and maintainability.

## Core stance

Treat complexity as the enemy because it creates bugs, slows changes, and hides risk. In every implementation or review, look for:

- **Change amplification**: a small behavior change requires edits in many places.
- **Cognitive load**: a reader must keep too many facts, ordering rules, flags, or cross-module details in mind.
- **Unknown unknowns**: it is hard to know what must be inspected before making a safe change.

Prefer designs that localize knowledge, expose simple contracts, and make invalid or surprising states harder to express.

## Default workflow for code changes

For nontrivial changes, follow this checklist internally and surface the important parts in your response.

1. **Understand the requested behavior**
   - Identify the user-visible behavior, affected APIs, data flow, and compatibility constraints.
   - If requirements are incomplete, proceed with explicit assumptions rather than inventing hidden requirements.

2. **Map the current design before editing**
   - Find existing abstractions, conventions, tests, and error-handling style.
   - Look for the design decision the current code is trying to hide or expose.
   - Do not add a new abstraction until you know what knowledge it will hide.

3. **Write the correctness contract**
   - State inputs, outputs, invariants, side effects, ordering requirements, failure behavior, and edge cases.
   - For bug fixes, identify the violated invariant or missing case.
   - For refactors, separate behavior-preserving steps from behavior-changing steps.

4. **Apply the design pressure test**
   - Will this make the most common use simpler?
   - Does it push complexity into one module rather than many callers?
   - Does it hide implementation knowledge or leak it?
   - Are special cases, flags, temporal steps, or duplicated decisions spreading?
   - Would a future maintainer understand what matters without reading unrelated code?

5. **Design it twice when the change affects an interface, module boundary, persistence model, error model, or cross-cutting behavior**
   - Sketch at least two viable approaches.
   - Prefer the one with the simpler public contract, better information hiding, fewer special cases, and clearer tests.
   - See `references/design-it-twice.md` for a compact decision template.

6. **Implement strategically, not tactically**
   - Make the smallest change that fixes the behavior while improving or preserving the design.
   - Avoid one-off patches that add hidden coupling, duplicated checks, or special-case branches in multiple places.
   - When a local cleanup is directly adjacent to the change and reduces risk, do it.

7. **Verify and review the diff**
   - Run targeted tests first, then broader tests when feasible.
   - Add or update tests for the correctness contract and important edge cases.
   - Re-read the diff for accidental complexity: leaked decisions, confusing names, stale comments, overexposed parameters, broad exceptions, and unnecessary layers.

## Default workflow for code review

When reviewing a diff or PR, prioritize correctness first, then design quality. Avoid style-only reviews unless style affects readability or consistency.

1. **Start outside-in**: What behavior or contract changes for callers and users?
2. **Check correctness hazards**: invariants, boundaries, null/empty cases, concurrency, idempotency, security/authorization, data loss, migration safety, error handling, and test coverage.
3. **Check design hazards**: shallow modules, leaked decisions, pass-through layers, temporal decomposition, over-specialized APIs, too many flags, duplicated logic, vague names, and comments that obscure rather than clarify.
4. **Give actionable feedback**: tie every finding to evidence, risk, and a concrete fix.
5. **Distinguish blockers from design pressure**: not every smell should block a merge, but repeated small smells are how systems become hard to change.

Use `references/review-rubric.md` for severity and output format.

## Default workflow for refactoring

Refactoring should reduce future complexity without changing behavior.

1. Establish a safety net: existing tests, new characterization tests, or a precise manual verification path.
2. Name the design problem before changing code: leakage, duplication, shallow interface, unclear invariant, mixed general/special code, etc.
3. Choose a narrow seam: a module boundary, API contract, error model, or data representation.
4. Refactor in small, reviewable steps. Keep behavior-preserving changes separate from feature changes when possible.
5. Verify after each step when the risk is high.
6. Update comments near the code and remove stale or duplicated comments.

## Default workflow for debugging

A bug fix should repair the design path that allowed the bug, not just suppress the symptom.

1. Reproduce or clearly infer the failure.
2. Identify the broken invariant, hidden assumption, missing normalization, or leaked implementation detail.
3. Decide whether the best fix is local validation, moving responsibility downward into a deeper module, defining an error out of existence, or making invalid state unrepresentable.
4. Add a regression test around the bug and at least one adjacent edge case when feasible.
5. Review whether the fix added a special case that should instead be generalized.

## Design principles to apply

Read `references/principles.md` when a task involves API design, module boundaries, refactoring, comments, naming, error handling, performance, or architectural tradeoffs.

Read `references/book-concept-map.md` only when the user asks how this skill maps back to the source book, wants to tune the skill, or wants deeper rationale for the workflows.


Use these distilled principles:

- **Deep modules beat shallow modules**: a module should provide substantial capability behind a simple interface.
- **The interface matters more than implementation convenience**: it is usually better for one implementer to handle complexity than for many callers to handle it repeatedly.
- **Hide information**: keep design decisions, representations, defaults, protocols, and ordering rules inside the module that owns them.
- **Avoid leakage**: if a decision changes, one module should change; duplicated knowledge is a design warning.
- **Make modules somewhat general-purpose**: solve the underlying operation, not just the current UI gesture or call site, while avoiding speculative overengineering.
- **Different layers need different abstractions**: a layer that merely forwards arguments is usually not earning its keep.
- **Pull complexity downward**: push tricky details into the lower-level module when that simplifies many callers and preserves a clean abstraction.
- **Define errors out of existence**: when possible, normalize inputs, provide total operations, choose safe defaults, or aggregate failures so callers face fewer cases.
- **Comments are design tools**: interface comments should define contracts and invariants; implementation comments should explain non-obvious why, not restate how.
- **Names should create the right mental image**: prefer precise, consistent, unsurprising names over generic or decorative ones.
- **Code should be obvious**: optimize for the reader's ability to understand and safely modify code, not for the writer's short-term speed.
- **Decide what matters**: emphasize the facts with leverage and hide the rest.

## Red flags to scan for

Read `references/red-flags.md` when reviewing existing code or evaluating a proposed design. Treat red flags as prompts for investigation, not automatic condemnation.

High-value red flags:

- Shallow modules or methods whose interface is nearly as complex as the implementation.
- Information leakage across modules, helpers, tests, config, or comments.
- Temporal decomposition: code split by execution order rather than by hidden knowledge or abstraction.
- Pass-through methods, pass-through variables, and wrapper layers that add no abstraction.
- Special-purpose and general-purpose logic tangled together.
- Repeated nontrivial logic, especially repeated validation, formatting, defaults, or error handling.
- Conjoined methods that cannot be understood or changed independently.
- Overexposed APIs that force common callers to know rare options.
- Vague names, names that are hard to choose, or documentation that becomes long because the concept is muddled.
- Nonobvious code: surprising side effects, hidden dependencies, inconsistent conventions, broad catches, stale comments, and unclear invariants.

## Optional static scan

For larger reviews, run the heuristic scanner to find design pressure points. This is not a substitute for reading code.

```bash
python scripts/complexity_scan.py path/to/file_or_repo
python scripts/complexity_scan.py path/to/file_or_repo --json
```

Use the output to decide where to inspect, then apply the design principles manually.

## Response style

For implementation tasks, include the patch or code, tests/validation performed, and important design reasoning. Keep the reasoning concise but make tradeoffs explicit.

For reviews, use this compact structure unless the user requested another format:

```markdown
## Verdict
[merge/block/needs changes, with one-sentence rationale]

## Correctness and safety
- [severity] [issue]: evidence, risk, suggested fix

## Design quality
- [severity] [issue]: evidence, risk, suggested fix

## Tests and verification
- Existing coverage observed
- Tests to add or run

## Suggested next patch
[smallest strategic change]
```

When the user asks for a quick fix, still check whether the quick fix adds future complexity. If it does, provide the tactical patch only with a safer strategic alternative and explain the tradeoff briefly.
