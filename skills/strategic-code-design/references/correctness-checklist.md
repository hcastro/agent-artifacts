# Correctness Checklist

Use this file when implementing, debugging, or reviewing code where correctness matters.

## Contract checklist

For each changed function, class, endpoint, job, event, or schema, identify:

- Inputs and accepted ranges/forms
- Output and return semantics
- Side effects
- Ownership and mutation rules
- Invariants before and after the operation
- Error behavior
- Ordering requirements
- Idempotency and retry behavior
- Concurrency assumptions
- Security or authorization boundary
- Backward/forward compatibility

If the contract is hard to state, treat that as a design smell.

## Boundary cases

Check the cases relevant to the code:

- Empty, null, missing, malformed, duplicate, and out-of-order input
- Minimum/maximum values
- Unknown enum values
- Time zones, clock skew, expired values, and daylight saving if dates matter
- Unicode, casing, whitespace, and normalization if strings matter
- Partial failures, retries, cancellation, and timeouts
- Multiple users/tenants/permissions
- Concurrent updates and stale reads
- Migrations with old and new code running simultaneously
- External service errors and schema changes

## Invariant-driven debugging

When fixing a bug:

1. State the invariant that should always hold.
2. Find the first place the invariant becomes false.
3. Decide which module should own that invariant.
4. Move or add enforcement there.
5. Add a regression test that would fail without the fix.

Do not only patch the final symptom if the invariant can still be violated through another path.

## Error-model design

Prefer reducing the number of error states callers must handle.

Ask:

- Can invalid input be normalized at the boundary?
- Can invalid state be impossible through construction?
- Can a lower-level module retry or recover without exposing the failure?
- Can several low-level errors be aggregated into one meaningful high-level result?
- Does the caller genuinely need to distinguish these failures?
- Would returning `null`, `false`, or an empty collection hide important information?

## Testing strategy

Choose the cheapest tests that prove the contract.

- **Unit tests**: invariants, pure logic, state machines, edge cases.
- **Integration tests**: module boundaries, persistence, external adapters, serialization, auth, migrations.
- **Characterization tests**: before refactoring unclear legacy behavior.
- **Property/table tests**: many input combinations, normalization, parsing, permission matrices.
- **Regression tests**: exact bug scenario plus adjacent edge case.
- **Performance tests**: only when performance matters or is claimed.

Test behavior at useful boundaries. Avoid tests that duplicate implementation details so tightly that they block safe refactoring.

## Final verification note

In the final response, state:

- What was changed.
- What tests or checks were run.
- What was not run and why, if applicable.
- Any remaining risk or assumption.
