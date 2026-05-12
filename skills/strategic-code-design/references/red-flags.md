# Red Flags Reference

Use this file when reviewing code, evaluating an implementation plan, or deciding whether a quick fix is adding accidental complexity. Red flags are investigation prompts, not automatic verdicts.

## Contents

- How to use red flags
- Module and interface red flags
- Information and dependency red flags
- Error and correctness red flags
- Comments, names, and readability red flags
- Refactoring response patterns

## How to use red flags

For each red flag, ask:

1. What future change would this make harder?
2. What knowledge is forced onto callers or distant code?
3. Is the issue causing correctness risk now, or only maintainability pressure?
4. What is the smallest strategic change that reduces the pressure?

Report red flags with evidence and a concrete fix. Avoid vague feedback such as "this is messy".

## Module and interface red flags

### Shallow module

**Looks like**: a class, function, service, or helper whose interface is nearly as complicated as its body.

**Risk**: adds indirection without reducing cognitive load.

**Response**: merge it away, make it own a real design decision, or redesign the interface around a complete operation.

### Pass-through method or variable

**Looks like**: methods that forward arguments to another method with a similar signature; parameters passed through many layers unchanged; wrappers that rename but do not abstract.

**Risk**: change amplification and fake modularity.

**Response**: remove the layer, move the real behavior into it, or replace pass-through parameters with an object owned by the layer that understands them.

### Overexposure

**Looks like**: common callers must provide rarely used options, flags, callbacks, config objects, or ordering details.

**Risk**: the interface forces users to understand implementation details and rare cases.

**Response**: provide a simple common path, safe defaults, named constructors/factories, or a deeper operation that hides the rare path.

### Classitis or premature splitting

**Looks like**: many tiny classes/functions created before there is a real abstraction; files that must be read together to understand one behavior.

**Risk**: fragmentation, weak names, extra navigation, and hidden dependencies.

**Response**: join code that shares information or define a single deeper abstraction.

### Conjoined methods

**Looks like**: two methods cannot be understood, tested, or modified independently because each relies on implicit state set by the other.

**Risk**: ordering bugs and unknown unknowns.

**Response**: combine into one operation, make the state explicit, or move the sequence into the owning module.

## Information and dependency red flags

### Information leakage

**Looks like**: representation, protocol, validation, formatting, defaults, authorization, or state-transition logic duplicated outside the module that owns it.

**Risk**: a single design change requires scattered edits and tests miss inconsistent updates.

**Response**: identify the leaked decision, move it to the owner, and expose a behavior-level API.

### Temporal decomposition

**Looks like**: modules or functions named around execution phases such as prepare/process/finalize where each phase shares the same knowledge.

**Risk**: code is split by time rather than by hidden information, so every phase must understand the whole operation.

**Response**: reorganize around stable concepts, data ownership, or invariants rather than step order.

### Repetition

**Looks like**: repeated nontrivial branches, regexes, SQL fragments, serialization, validation, error mapping, or test setup.

**Risk**: inconsistent fixes and change amplification.

**Response**: centralize the repeated decision in a deep module; do not merely create a shallow helper unless it hides the repeated knowledge.

### Special-general mixture

**Looks like**: reusable mechanisms contain endpoint-specific, UI-specific, tenant-specific, or feature-specific branches.

**Risk**: a general module becomes harder to reuse and reason about.

**Response**: keep special-purpose policy at the edge; pass a clean general operation into the mechanism, or split policy from mechanism.

### Configuration leakage

**Looks like**: a value is passed through many functions only so a low-level module can use it; many callers know low-level configuration names.

**Risk**: callers become coupled to implementation details.

**Response**: introduce an owning object, context, factory, or module-level default that hides the configuration from unrelated layers.

## Error and correctness red flags

### Exception explosion

**Looks like**: many catch blocks, repeated error mapping, broad catches, or callers that all handle the same low-level failures.

**Risk**: alternate paths multiply and behavior becomes hard to reason about.

**Response**: define errors out of existence, mask or aggregate lower-level errors, or expose one high-level error contract.

### Swallowed or vague failure

**Looks like**: empty catch blocks, logs without action, generic false/null returns, or "best effort" behavior without a contract.

**Risk**: bugs become unknown unknowns.

**Response**: make failure behavior explicit; return a typed result, throw a meaningful error, or document and test best-effort semantics.

### Scattered invariant checks

**Looks like**: the same precondition or state validation appears in many callers.

**Risk**: missing one check causes correctness bugs.

**Response**: move the invariant into the type, constructor, state machine, parser, repository, or service that owns it.

### Boolean flag control

**Looks like**: methods with `isDryRun`, `skipValidation`, `includeInactive`, `force`, or multiple boolean parameters.

**Risk**: hidden mode combinations and unclear call sites.

**Response**: use separate named operations, an options object with safe defaults, or a deeper command that owns the mode semantics.

### Edge-case branch accretion

**Looks like**: a bug fix adds one more branch beside many previous one-off branches.

**Risk**: tactical patches grow into an untestable decision tree.

**Response**: find the underlying classification or invariant, normalize earlier, or replace branches with a table/state machine/policy object.

## Comments, names, and readability red flags

### Comment repeats code

**Looks like**: a comment says the same thing as the adjacent expression.

**Risk**: adds noise and can become stale.

**Response**: delete it or replace it with the non-obvious contract, invariant, rationale, or consequence.

### Interface documentation exposes implementation details

**Looks like**: public docs describe private data structures, algorithms, lock ordering, or internal method calls that users do not need.

**Risk**: callers depend on implementation details, making change harder.

**Response**: rewrite docs around caller-visible behavior, preconditions, side effects, and errors.

### Vague name

**Looks like**: `data`, `info`, `manager`, `helper`, `processor`, `value`, `tmp`, `handle`, `doThing`, `process`, or names with overloaded meaning.

**Risk**: readers cannot form a reliable mental model.

**Response**: name the role, invariant, unit, lifecycle state, domain concept, or operation.

### Hard-to-name concept

**Looks like**: every proposed name feels awkward or too long.

**Risk**: the abstraction may be muddled or mixing responsibilities.

**Response**: reconsider the boundary before settling for a weak name.

### Hard-to-describe behavior

**Looks like**: complete documentation needs a long sequence of caveats, modes, and exceptions.

**Risk**: the interface is too complicated.

**Response**: simplify the contract, split modes into named operations, define errors out of existence, or push details downward.

### Nonobvious code

**Looks like**: surprising side effects, unclear ownership, inconsistent conventions, hidden dependencies, tricky boolean logic, stale comments, or implicit ordering.

**Risk**: future changes introduce bugs because readers mispredict behavior.

**Response**: clarify names, state invariants, simplify conditions, localize side effects, and add focused tests.

## Refactoring response patterns

Use these patterns after identifying a red flag.

### Move knowledge to owner

When a design decision appears in multiple places, choose one owning module. Move defaults, validation, mapping, formatting, or error handling there. Expose behavior, not representation.

### Combine steps into one operation

When callers must remember a fixed sequence, provide one method that performs the sequence and owns ordering, cleanup, and errors.

### Split policy from mechanism

When reusable code contains special-purpose branches, keep the general operation generic and move feature-specific policy to the edge.

### Replace mode flags with named concepts

When boolean flags create hidden modes, use named methods, command objects, or options with clear defaults and validation.

### Normalize early

When downstream code handles many equivalent input shapes, normalize at the boundary so internal code sees one representation.

### Add a contract comment

When behavior is correct but not obvious, add or update a nearby interface comment stating invariants, side effects, and errors. Do not use comments to excuse avoidable complexity.
