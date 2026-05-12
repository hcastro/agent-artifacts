# Review Rubric

Use this file for PR reviews, codebase audits, and self-review before finalizing a patch.

## Review priorities

1. Correctness and safety
2. Interface/API contracts
3. Complexity and maintainability
4. Tests and verification
5. Naming, comments, and consistency
6. Performance only where relevant or claimed

## Severity levels

### Blocker

Use for issues that can cause data loss, security exposure, incorrect external behavior, broken migrations, crashes on common paths, or changes that cannot be safely reviewed because the contract is unclear.

Examples:

- Authorization or tenant isolation bypass.
- State transition allows invalid state.
- Migration can corrupt or drop live data.
- Error path silently loses user work.
- Refactor changes behavior without tests or explanation.

### High

Use for likely bugs or design choices that make future correctness failures probable.

Examples:

- New API forces callers to duplicate validation.
- Error handling swallows failures that should be surfaced.
- A behavior branch is untested and likely reachable.
- Implementation leaks a representation into multiple modules.
- Concurrency or idempotency assumptions are implicit.

### Medium

Use for complexity that does not immediately break behavior but raises future risk.

Examples:

- Shallow wrapper or pass-through layer.
- Vague names for important concepts.
- Repeated nontrivial logic.
- Special-purpose code mixed into general-purpose module.
- Comments likely to become stale.

### Low

Use for local clarity, consistency, or style issues that are easy to fix and unlikely to affect correctness.

Examples:

- Minor naming precision.
- Test name could better describe behavior.
- Local formatting inconsistency.

## Review method

1. **State the intended behavior** in one sentence.
2. **Identify changed contracts**: public APIs, database schema, files, network payloads, event streams, user-visible behavior.
3. **Check correctness**: edge cases, invariants, data ownership, error behavior, race conditions, permissions, rollback/retry, idempotency.
4. **Check design complexity**: deep vs shallow modules, information hiding, leakage, temporal decomposition, repeated logic, special/general mixing, pass-through parameters.
5. **Check tests**: do tests prove the contract? Are failure and edge cases covered? Are tests coupled to implementation details?
6. **Suggest smallest strategic fix**: avoid broad rewrites unless the current patch is unsafe.

## Output template

```markdown
## Verdict
[Approve / Needs changes / Block]

One-sentence reason.

## Correctness and safety
- [Severity] [Title]
  - Evidence: [specific code or behavior]
  - Risk: [what can go wrong]
  - Fix: [concrete change]

## Design quality
- [Severity] [Title]
  - Evidence: [specific code or behavior]
  - Risk: [future change or cognitive-load impact]
  - Fix: [concrete design improvement]

## Tests and verification
- Current coverage: [what exists]
- Add/run: [specific tests or commands]

## Suggested next patch
[Smallest strategic patch that improves correctness and design]
```

## Comment style for PRs

Good review comments are specific and tied to risk.

Prefer:

- "This repeats the normalization rule from `UserParser`. If the accepted formats change, these two branches can diverge. Could `UserParser.normalizeEmail` own this and expose a single normalized value?"
- "This catch converts all failures to `null`, so callers cannot distinguish not-found from network failure. That makes retries impossible. Consider returning a typed result or throwing a higher-level `LookupFailed`."
- "The new `send(..., force, skipValidation)` signature creates four modes but only two are meaningful. Named operations would make invalid combinations unrepresentable."

Avoid:

- "This is messy."
- "Bad abstraction."
- "Use clean code."
- "I don't like this name."

## Approval guidance

Approve when:

- Behavior is correct and tested or safely verifiable.
- Any added complexity is localized and justified.
- Public contracts are clear.
- The change follows existing conventions or intentionally improves them.

Request changes when:

- Correctness is uncertain in important cases.
- The patch spreads a design decision across modules.
- The interface becomes harder for common callers.
- Tests assert implementation details while missing behavior.

Block when:

- The diff can cause severe user harm, data loss, security issues, or unreviewable behavior changes.
