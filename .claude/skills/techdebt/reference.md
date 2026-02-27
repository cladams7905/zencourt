# Technical Debt Reference: Code Smells & Refactoring Patterns

Use when you need detailed definitions, refactoring tactics, or logging conventions.

---

## Code Smells Catalog

### Bloaters (too much)

| Smell | Description | Refactor |
| ----- | ----------- | -------- |
| **Long Method** | Method does too much, hard to follow | Extract Method, Replace Temp with Query |
| **Large Class** | Class has many fields/methods, multiple responsibilities | Extract Class, Extract Subclass |
| **Long Parameter List** | 4+ parameters, unclear intent | Introduce Parameter Object, Preserve Whole Object |
| **Data Clumps** | Same group of data passed together repeatedly | Extract Class, Introduce Parameter Object |

### Object-Orientation Abusers

| Smell | Description | Refactor |
| ----- | ----------- | -------- |
| **Switch Statements** | Large switch/if-else on type or enum | Replace with Polymorphism, Strategy, State |
| **Refused Bequest** | Subclass doesn't use inherited members | Replace Inheritance with Delegation |
| **Alternative Classes with Different Interfaces** | Same purpose, different APIs | Rename Method, Move Method for consistency |
| **Temporary Field** | Field only used in certain cases | Extract Class, Replace with explicit params |

### Change Preventers

| Smell | Description | Refactor |
| ----- | ----------- | -------- |
| **Divergent Change** | One class changed for many different reasons | Extract Class(es) by reason for change |
| **Shotgun Surgery** | One change requires edits in many places | Move Method/Field, Inline Class |
| **Parallel Inheritance Hierarchies** | Creating subclass A requires creating subclass B | Merge hierarchies or flatten |

### Dispensables

| Smell | Description | Refactor |
| ----- | ----------- | -------- |
| **Comments** | Comment explains bad code | Improve naming, extract method; keep only "why" comments |
| **Duplicate Code** | Same logic in multiple places | Extract Method, Form Template Method, Pull Up Method |
| **Lazy Class** | Class does little | Inline Class, Collapse Hierarchy |
| **Data Class** | Class only holds data, no behavior | Move behavior into class, or extract to DTO if intentional |
| **Dead Code** | Unreachable or unused code | Remove |
| **Speculative Generality** | Unused abstractions "for future use" | Collapse Hierarchy, Inline Class, Remove Parameter |

### Couplers

| Smell | Description | Refactor |
| ----- | ----------- | -------- |
| **Feature Envy** | Method uses another object's data more than its own | Move Method, Extract Method |
| **Inappropriate Intimacy** | Classes know too much about each other | Move Method/Field, Change Bidirectional to Unidirectional, Extract Class |
| **Message Chains** | a.getB().getC().getD() | Hide Delegate, Extract Method |
| **Middle Man** | Class delegates everything | Remove Middle Man, Inline |

### Primitive Obsession

Using primitives (string, number, bool) instead of small value objects (e.g. `Email`, `Money`, `DateRange`). Refactor: Extract Class, Replace Type Code with Class, Introduce Parameter Object.

---

## Refactoring Patterns (Quick Reference)

| Pattern | When to Use |
| ------- | ----------- |
| **Extract Function** | Block of code with a name would clarify intent |
| **Extract Variable** | Complex expression used multiple times or hard to read |
| **Inline Function/Variable** | Body is as clear as the name |
| **Slide Statements** | Statements that belong together are separated |
| **Split Loop** | Loop does two different things |
| **Replace Temp with Query** | Temp variable holds result of expression; extract to function |
| **Introduce Parameter Object** | Group of parameters often passed together |
| **Preserve Whole Object** | Pass object instead of several of its values |
| **Replace Conditional with Polymorphism** | Complex switch/if-else on type |
| **Introduce Null Object** | Repeated null checks |
| **Extract Class** | Class has two responsibilities |
| **Move Method** | Method is used more by another class |
| **Hide Delegate** | Client calls a.getB().foo() — add a.foo() that delegates |

---

## Documentation Guidelines

- **JSDoc/TSDoc** for all public functions: purpose, params, return, throws
- **Module-level** comment when module purpose isn't obvious from name
- **"Why" comments** when behavior is non-obvious (business rule, workaround)
- Prefer self-documenting names over comments that restate the code

---

## Logging Guidelines

| Level | Use For |
| ----- | ------- |
| **error** | Exceptions, unrecoverable failures |
| **warn** | Recoverable issues, deprecated usage |
| **info** | Key business events, request boundaries |
| **debug** | Detailed flow, state at decision points |

**Where to log:**
- Service/API boundaries (in/out)
- Before/after external calls
- Error handlers (with context)
- Non-obvious branches or fallbacks

**What to include:** structured fields (e.g. `userId`, `requestId`) rather than long concatenated strings.
