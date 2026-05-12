# Book-to-Agent Concept Map

This reference maps the book's major ideas into agent behaviors. Read it when tuning the skill, explaining why it recommends a design move, or creating additional evals.

The mapping is paraphrased and operational. It is not a substitute for the book.

## 1. Introduction: complexity as the central design problem

**Book idea:** Software becomes expensive when developers can no longer understand and safely modify it.

**Agent behavior:** Treat every code task as both a behavior task and a complexity-management task. In addition to making code work, ask whether the change reduces or increases future cognitive load.

**Practical output:** State the behavior change, then identify the design decision or invariant that should own it.

## 2. The Nature of Complexity

**Book idea:** Complexity shows up as change amplification, cognitive load, and unknown unknowns. It is caused by dependencies and obscurity, and it accumulates incrementally.

**Agent behavior:** In reviews and refactors, do not only search for large obvious problems. Small leaks, vague names, and repeated decisions are worth naming because they compound.

**Practical output:** For each design finding, say which complexity symptom it creates and how the fix reduces it.

## 3. Working Code Isn't Enough

**Book idea:** Tactical programming produces working features quickly but leaves behind small complexities. Strategic programming makes continual small design investments.

**Agent behavior:** When asked for a quick fix, provide the shortest safe fix but check whether it spreads complexity. Offer a small strategic version when the tactical patch would create future risk.

**Practical output:** "Tactical patch" vs "strategic patch" when useful.

## 4. Modules Should Be Deep

**Book idea:** The best modules provide significant functionality through simple interfaces. Shallow modules add indirection without hiding enough complexity.

**Agent behavior:** Prefer APIs that make common use simple, hide rare options, and concentrate implementation complexity inside the owner module.

**Practical output:** Apply the deep-module test before introducing new wrappers, services, helpers, or classes.

## 5. Information Hiding and Leakage

**Book idea:** Modules should hide design decisions. Leakage occurs when one decision is reflected across multiple modules.

**Agent behavior:** Search for duplicated knowledge: validation rules, defaults, representations, formatting, protocol details, and ordering rules. Move ownership to the module with the most relevant knowledge.

**Practical output:** "The leaked decision is X; the likely owner is Y; expose behavior Z instead."

## 6. General-Purpose Modules Are Deeper

**Book idea:** Somewhat general-purpose operations can reduce special cases and make modules deeper, but speculative generality is harmful.

**Agent behavior:** Replace feature-specific operations with underlying operations when that reduces duplication and hides information. Do not add abstract machinery for imagined futures.

**Practical output:** Distinguish "natural generality" from overengineering.

## 7. Different Layer, Different Abstraction

**Book idea:** Each layer should add a distinct abstraction. Pass-through methods and variables are red flags unless they add policy, translation, or protection.

**Agent behavior:** Challenge wrappers and layers that simply forward names, parameters, or errors. Either remove them or make them own a meaningful boundary.

**Practical output:** "This layer currently forwards; it would earn its place if it owned X."

## 8. Pull Complexity Downwards

**Book idea:** It is often better for a lower-level module to handle complexity once than for many callers to handle it repeatedly.

**Agent behavior:** Push validation, normalization, retries, defaults, and invariant enforcement into the module that owns the knowledge, as long as this does not mix unrelated policy into a general mechanism.

**Practical output:** Move repeated caller logic into a deeper operation.

## 9. Better Together or Better Apart

**Book idea:** Decomposition is about reducing complexity, not maximizing the number of pieces. Bring things together when they share information; split them when they are different abstractions.

**Agent behavior:** Avoid arbitrary extraction. Split only when the extracted piece has a clear name, contract, and reason to change independently.

**Practical output:** Refactor around ownership, invariants, and abstractions rather than line count or execution order.

## 10. Define Errors Out of Existence

**Book idea:** Error cases multiply complexity. Good design can eliminate some errors, hide others, or aggregate them.

**Agent behavior:** Before exposing an error to callers, ask whether the operation can be made total, normalized, retried, masked, or aggregated into a higher-level result.

**Practical output:** Design error models that simplify caller obligations without hiding important failures.

## 11. Design It Twice

**Book idea:** The first design is rarely the best. Comparing alternatives improves design judgment.

**Agent behavior:** For APIs, module boundaries, persistence formats, error models, and high-risk refactors, present two options and choose using caller simplicity, information hiding, correctness, testability, and change locality.

**Practical output:** Use `references/design-it-twice.md`.

## 12-15. Comments, Documentation, Names, and Comments First

**Book idea:** Comments are useful when they describe non-obvious contracts, invariants, rationale, and design intent. Good names and early comments clarify design before implementation hardens.

**Agent behavior:** Treat hard-to-write comments and hard-to-pick names as design feedback. For new interfaces, draft the contract comment before finalizing code.

**Practical output:** Replace code-repeating comments with contract/rationale comments. Use precise names that convey the most important facts.

## 16. Modifying Existing Code

**Book idea:** Strategic thinking matters most during maintenance. Comments must evolve with code and stay near the facts they describe.

**Agent behavior:** Preserve behavior, learn conventions, update comments in the same diff, and check diffs for stale documentation or accidental complexity.

**Practical output:** Separate behavior-preserving refactors from behavior changes and state verification clearly.

## 17-18. Consistency and Obviousness

**Book idea:** Consistency and obvious code reduce cognitive load. Non-obvious code creates bugs because readers mispredict behavior.

**Agent behavior:** Follow local conventions unless they are harmful. Flag surprise: hidden side effects, inconsistent naming, unexpected dependencies, clever logic, and implicit ordering.

**Practical output:** Prefer boring, predictable code with explicit invariants.

## 19. Software Trends

**Book idea:** Practices such as OOP, Agile, tests, TDD, patterns, and getters/setters are tools, not automatic design wins. Misapplied trends can increase complexity.

**Agent behavior:** Do not recommend patterns or layers merely because they are fashionable. Use tests to support design and correctness, but do not let tests over-couple to implementation details.

**Practical output:** Judge practices by whether they reduce complexity and improve safe change.

## 20. Designing for Performance

**Book idea:** Clean design and performance are often compatible. Avoid optimizing everything, but understand expensive operations and design critical paths naturally.

**Agent behavior:** If performance matters, identify critical paths and expensive operations, then localize optimization. Measure before claiming improvement.

**Practical output:** Prefer batching, caching, and representation choices inside owning modules rather than scattered micro-optimizations.

## 21. Decide What Matters

**Book idea:** Good design emphasizes high-leverage facts and hides incidental details.

**Agent behavior:** Find the invariants, state transitions, security boundaries, error semantics, and common use cases with the most leverage. Make those obvious in names, contracts, APIs, and tests.

**Practical output:** "What matters here is X; the design should make X visible and hide Y."

## 22. Conclusion

**Book idea:** Better design pays back by making programming faster, safer, and more enjoyable over time.

**Agent behavior:** Optimize not just for the current answer, but for the next maintainer's ability to understand and change the system safely.

**Practical output:** Every substantial answer should include verification and a short note on the design tradeoff.
