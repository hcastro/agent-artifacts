# Principles Reference

Use this file when a task requires deeper design judgment than a straightforward edit. The goal is to convert design philosophy into concrete choices an agent can make while reading and changing code.

## Contents

- Complexity model
- Strategic programming
- Deep modules and simple interfaces
- Information hiding and leakage
- General-purpose modules without overengineering
- Different layer, different abstraction
- Pulling complexity downward
- Together or apart
- Error handling
- Comments, names, and obviousness
- Modifying existing code
- Consistency
- Performance
- Deciding what matters

## Complexity model

Complexity is the practical difficulty of understanding and modifying a system. Judge it from the perspective of a developer trying to make a specific change.

The three most useful symptoms are:

1. **Change amplification**: one conceptual change forces many edits.
2. **Cognitive load**: the developer must remember many details to make a safe change.
3. **Unknown unknowns**: the developer cannot tell what must be known before editing.

The two most useful causes are:

1. **Dependencies**: one piece of code cannot be understood or changed without another.
2. **Obscurity**: important facts are hidden, implicit, poorly named, or scattered.

When comparing designs, ask which option reduces those symptoms for the next maintainer.

## Strategic programming

A tactical patch optimizes only for getting the current change to work. A strategic change spends a small amount of extra effort to keep the system simple.

Use strategic programming when:

- A bug happened because the design allowed confusion.
- The same condition or transformation appears in multiple places.
- A caller must know ordering, representation, defaults, or implementation details.
- A new branch handles one concrete case but could be generalized cleanly.
- A name, comment, or interface is hard to explain.

A strategic change is not a rewrite. Prefer small adjacent improvements: localize validation, rename a misleading concept, move repeated policy into the owning module, or add an interface comment that states a real contract.

## Deep modules and simple interfaces

A deep module provides a lot of value behind a small, clear interface. A shallow module exposes nearly as much complexity as it hides.

A module is likely deep when:

- Common use is easy and requires few decisions.
- Rare options do not burden common callers.
- The interface hides storage, protocol, policy, ordering, retries, defaults, and special cases.
- The implementation may be nontrivial, but the caller's mental model is simple.
- Tests can focus on a clear contract rather than internal steps.

A module is likely shallow when:

- It simply forwards arguments to another function or object.
- Callers must pass flags or config that mirror implementation branches.
- Its documentation is mostly a list of steps callers must perform.
- It exists only because code was split into many tiny pieces, not because it hides knowledge.

Design rule: when choosing between a simple implementation with a messy interface and a slightly more complex implementation with a simple interface, prefer the simple interface if the module owns the relevant knowledge.

## Information hiding and leakage

Each module should own a small number of design decisions. Examples: data representation, protocol details, defaults, algorithms, caching strategy, ordering rules, failure recovery, formatting, authorization policy, or mapping between external and internal concepts.

Information hiding is working when a decision can change in one module without forcing callers to change.

Information leakage is present when:

- A representation appears in multiple modules.
- Tests duplicate implementation details instead of asserting behavior.
- Several call sites know the same default, validation rule, URL shape, SQL fragment, file layout, or state transition.
- A helper exposes intermediate steps rather than a complete operation.
- Comments in one module explain how another module works.

Response pattern:

1. Name the leaked decision.
2. Identify the module that should own it.
3. Move the decision into that module or create a boundary that hides it.
4. Update tests to verify behavior at the boundary.

## General-purpose modules without overengineering

A somewhat general interface often hides information better than a narrowly special-purpose one. The right generality captures the underlying operation, not speculative future features.

Good generality:

- Replaces several special cases with one natural operation.
- Makes the caller's intent clearer.
- Keeps policy-specific code at the edge and reusable mechanisms underneath.
- Reduces duplicate behavior.

Bad generality:

- Adds abstract factories, strategies, or configuration for hypothetical future needs.
- Forces callers to understand a larger vocabulary than the problem requires.
- Makes the common case harder.

Decision test: would the general operation be useful if the current UI gesture, endpoint, or call site were renamed? If yes, the abstraction may be real. If no, the module may just be overfit to the current feature.

## Different layer, different abstraction

Every layer should add a new abstraction. A layer that merely passes the same data, flags, and method names downward is usually a symptom of shallow design.

Pass-through layers are acceptable when they add something real:

- Access control
- Transaction boundaries
- Caching
- Logging with meaningful aggregation
- Protocol translation
- Error aggregation or retry policy
- Compatibility shim around an external interface

When a layer adds no new abstraction, either remove it or give it ownership of a real design decision.

## Pulling complexity downward

If many callers must handle the same special case, push that responsibility into the lower-level module that has the relevant knowledge. This may make the lower-level implementation more complex, but it simplifies the system overall.

Good downward movement:

- Input normalization inside the parser instead of at every call site.
- Retry/backoff inside the client instead of every caller.
- Default handling inside the builder/factory instead of repeated caller conditionals.
- State transition validation inside the state machine instead of scattered checks.

Avoid pulling complexity downward when it would mix unrelated policies or force a general module to know application-specific details. In those cases, keep special-purpose policy above and general-purpose mechanism below.

## Together or apart

Bring code together when it shares information, duplicates logic, or exposes a simpler interface as a combined unit. Split code apart when different parts represent different abstractions, change for different reasons, or mix general-purpose mechanisms with special-purpose policy.

Signals to bring together:

- Two functions must be read together to understand either one.
- A state invariant is maintained by multiple modules.
- Callers must invoke a fixed sequence of methods.
- Repeated setup, validation, formatting, or cleanup appears around a helper.

Signals to split apart:

- A general mechanism contains business-specific branches.
- A module has multiple independent reasons to change.
- A function's name or comment must mention unrelated concepts.
- Tests require excessive setup because the unit does too many things.

Do not split methods solely to make them short. Split when the extracted piece has a clear abstraction and a useful name.

## Error handling

Exceptions and error cases add complexity because they create alternate control paths. Reduce error complexity when possible.

Prefer, in order:

1. **Define the error out of existence**: make the operation total, normalize input, choose safe defaults, or make invalid states unrepresentable.
2. **Mask the error inside the owning module**: retry, recover, degrade gracefully, or convert to a simpler outcome.
3. **Aggregate related errors**: handle many low-level failures with one high-level policy.
4. **Expose an error deliberately**: when callers genuinely need to make different decisions.
5. **Crash/fail fast**: for impossible states, corrupted invariants, or cases where recovery would be misleading.

Check whether broad catches, swallowed errors, or repeated try/catch blocks are hiding a design problem.

## Comments, names, and obviousness

Comments should add information that code does not already make obvious.

Use comments for:

- Interface contracts: preconditions, postconditions, invariants, side effects, ownership, error behavior, concurrency assumptions.
- Non-obvious implementation choices: why this algorithm, cache, lock, order, or workaround exists.
- Cross-module decisions that would otherwise be scattered.

Avoid comments that:

- Repeat the code line by line.
- Describe implementation details in an interface contract unless callers need them.
- Live far away from the code they constrain.
- Apologize for confusing code instead of clarifying or simplifying it.

Names should create a precise mental image. If a good name is hard to find, treat that as a design smell: the concept may be muddled, too broad, too narrow, or mixing responsibilities.

## Modifying existing code

When changing existing code, preserve and improve design locally.

- Learn the current conventions before introducing new ones.
- Keep comments close to the code they describe.
- Update comments in the same diff as the code they describe.
- Check the diff for stale docs, duplicated logic, and accidental behavior changes.
- Prefer small cleanups that are adjacent to the change over broad unrelated refactors.
- Do not bury important design rationale only in a commit message; the next maintainer may see the code without the commit history.

## Consistency

Consistency reduces cognitive load. Follow existing conventions for names, layout, error handling, validation, and test style unless the convention is actively harmful.

When improving an inconsistent codebase:

1. Identify the dominant or best convention.
2. Apply it in the changed area.
3. Avoid mixing old and new styles in the same module.
4. Add a small local comment or test if the convention protects an invariant.

Do not enforce consistency blindly when it preserves a bad abstraction. Fix the abstraction or explain why the local deviation is safer.

## Performance

Clean design and good performance usually align when the design is naturally efficient.

Use this sequence:

1. Identify whether performance actually matters for this change.
2. Know which operations are fundamentally expensive in the context: network, disk, allocation, serialization, locks, cache misses, large scans, or rendering.
3. Design the common and critical paths to avoid repeated expensive operations.
4. Measure before and after when performance is a claim.
5. Keep optimization localized so the rest of the system remains obvious.

Avoid scattering micro-optimizations that make every caller harder to read.

## Deciding what matters

Good design emphasizes high-leverage facts and hides incidental details.

High-leverage facts include:

- Invariants
- Ownership rules
- State transitions
- Error semantics
- Security boundaries
- Data representation decisions
- Common use cases
- Performance-critical paths

When writing code, comments, names, or APIs, ask: what one fact would make many other facts easier to understand? Emphasize that fact. Everything else should move into implementation details, defaults, or lower-level helpers.
