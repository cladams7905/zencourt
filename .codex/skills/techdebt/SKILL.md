---
name: techdebt
description: Identifies technical debt using DRY, Single Responsibility Principle, and code smell analysis. Scans recently touched files for simplification opportunities, monolithic structures, and gaps in documentation and logging. Use when refactoring, reducing tech debt, improving code quality, or when the user mentions code smells, DRY, SRP, or maintainability.
---

# Technical Debt Eliminator

Scan recently changed code for DRY violations, SRP breaches, and code smells. Provide actionable refactors to simplify, deconstruct monoliths, and improve documentation and logging.

## When to Use

- Refactoring or reducing technical debt
- User asks for code quality improvement or maintainability review
- Before merging large changes (debt check)
- User mentions DRY, SRP, code smells, or monolithic code

## Workflow

### 1. Identify Scope

Scan **recently touched files** (from git status, recent edits, or user-specified paths). Prefer focused scope over whole-repo scans.

### 2. Run Analysis Checklist

For each file or module, check:

**DRY (Don't Repeat Yourself)**

- [ ] Duplicate logic that could be extracted to a shared function or module
- [ ] Copy-pasted blocks with minor variations
- [ ] Repeated validation, formatting, or mapping patterns
- [ ] Magic values/strings used in multiple places (extract constants)

**SRP (Single Responsibility Principle)**

- [ ] Functions/classes doing more than one cohesive thing
- [ ] Mixed concerns (UI + business logic, I/O + domain logic)
- [ ] Files over ~200–300 lines (consider splitting)
- [ ] Functions over ~20–30 lines (consider extracting)

**Code Smells** (see [reference.md](reference.md) for full catalog)

- [ ] Long methods, large classes
- [ ] Feature envy (method uses another object's data more than its own)
- [ ] Primitive obsession (primitives instead of value objects)
- [ ] Shotgun surgery (one change requires edits in many places)
- [ ] Speculative generality (unused abstraction)

**Documentation & Logging**

- [ ] Public APIs or complex logic missing JSDoc/docstrings
- [ ] No logging at decision points, errors, or important state changes
- [ ] Unclear naming that needs comments to explain intent

### 3. Output Format

For each finding:

```
## [File path]: [Category] – [Brief title]

**Issue:** One-sentence description.

**Location:** Line(s) or function/class name.

**Recommendation:** Concrete refactor (extract function, split module, add constant, etc.).

**Priority:** 🔴 High | 🟡 Medium | 🟢 Low
```

Group by file. End with a summary (High/Medium/Low counts) and suggested order of fixes.

### 4. Refactor Guidance

When implementing fixes:

- Extract shared logic into well-named helpers or modules
- Split large files by responsibility (one domain/facade per file)
- Add JSDoc for public functions and non-obvious logic
- Add structured logging (e.g. `logger.debug`, `logger.info`) at boundaries, errors, and key decisions
- Prefer clean breaks over backward-compat shims (per project refactor philosophy)
- Update tests alongside refactors; keep coverage in sync

## Heuristics

| Signal                     | Action                                     |
| -------------------------- | ------------------------------------------ |
| >200 lines in one file     | Consider splitting by responsibility       |
| >20 lines in one function  | Extract sub-functions with clear names     |
| Same logic in 2+ places    | Extract to shared utility                  |
| Function takes >4–5 params | Consider options object or domain type     |
| Deep nesting (>3 levels)   | Early returns, extract helpers             |
| Comment explains "why"     | Keep comment; consider renaming for "what" |

## Project-Specific Notes

Carefully inspect `CLAUDE.md` architecture (e.g. route→action→service, no DB in components). Technical debt fixes must not break layering or testing expectations.

## Additional Resources

- **Full code smell catalog, refactoring patterns, logging levels:** see [reference.md](reference.md)
