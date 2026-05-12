# Design It Twice

Use this template when a task affects a module boundary, public API, persistent representation, error model, concurrency model, or cross-cutting behavior.

The goal is not to over-plan. The goal is to avoid accepting the first design merely because it works.

## When to use

Use this process when:

- A new API or module is being introduced.
- A bug fix could be local or could move responsibility to another module.
- A change adds flags, modes, config, or error cases.
- A refactor changes ownership of data or state.
- The user asks for architecture, design, maintainability, or correctness guidance.

Skip or compress it when the change is purely mechanical and low-risk.

## Two-option template

```markdown
## Design options

### Option A: [name]
- Interface: [what callers do]
- Hidden knowledge: [what design decisions this owns]
- Correctness contract: [key invariant/error behavior]
- Pros: [simplicity, locality, testability]
- Cons: [risks, added complexity]

### Option B: [name]
- Interface: [what callers do]
- Hidden knowledge: [what design decisions this owns]
- Correctness contract: [key invariant/error behavior]
- Pros: [simplicity, locality, testability]
- Cons: [risks, added complexity]

### Decision
Choose [A/B] because [caller simplicity, information hiding, fewer special cases, lower change amplification, clearer tests].
```

## Comparison rubric

Score each option qualitatively:

- **Caller simplicity**: Does common use require few decisions?
- **Information hiding**: Does the owner hide representation, defaults, ordering, or errors?
- **Change locality**: If a likely future change occurs, how many modules change?
- **Correctness**: Are invalid states or mode combinations prevented?
- **Testability**: Can behavior be tested at a stable boundary?
- **Consistency**: Does it fit existing conventions?
- **Performance**: Is the critical path naturally efficient without scattered optimization?

## Common outcomes

### Choose a deeper module

When callers would otherwise repeat validation, setup, retries, or ordering, create one operation that owns the sequence.

### Choose a more general operation

When several special cases share the same underlying operation, expose that operation and keep special policy at the edge.

### Choose fewer modes

When an API needs multiple boolean flags, split into named operations or an options object that validates combinations.

### Choose no new abstraction

When an extraction would only create a pass-through method or vague helper, keep code together until a real abstraction appears.

### Choose to improve names/comments first

When behavior is mostly correct but hard to understand, precise names and contract comments may reduce risk more than structural changes.
