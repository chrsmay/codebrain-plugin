---
name: quality
description: "Use when scanning for dead code, unused imports, stub functions, duplicate logic, or general code quality issues. Runs automated detection tools and AI-powered analysis to find problems that linters miss."
version: 1.0.0
metadata:
  priority: 5
  pathPatterns:
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.js"
    - "**/*.jsx"
    - "**/*.py"
  bashPatterns:
    - "\\bnpm\\s+run\\s+lint\\b"
    - "\\beslint\\b"
    - "\\bruff\\b"
    - "\\bpylint\\b"
    - "\\bknip\\b"
  promptSignals:
    phrases:
      - "dead code"
      - "unused imports"
      - "code quality"
      - "duplicated code"
      - "find stubs"
      - "clean up unused"
      - "code coverage"
      - "tech debt"
      - "technical debt"
      - "code smell"
    allOf:
      - [dead, code]
      - [unused, code]
      - [code, quality]
    anyOf:
      - "quality"
      - "dead code"
      - "unused"
      - "duplication"
      - "tech debt"
    noneOf: []
  chainTo:
    - pattern: "## Dead Code Found|## Quality Issues|## Findings"
      targetSkill: refactor
      message: "Quality issues found - refactor to fix"
---

# CodeBrain Quality

Codebase quality scan for dead code, unused imports, stubs, duplicates, and tech debt.

## Usage

`/codebrain:quality [path]`

- If path provided: scan that file or directory
- If no path: scan the entire project (git-tracked files)

## Workflow

1. **Determine scope.**
   - If argument: use that path
   - If no argument: scan git-tracked files (`git ls-files`)

2. **Detect project stack** from config or auto-detect.

3. **Run automated tools** (based on stack):

   **ESLint (via MCP — structured results):**
   - Call `mcp__eslint__eslint_lint` on the target scope for structured lint violations
   - This catches unused vars, unreachable code, style issues, and correctness problems

   **TypeScript/JavaScript (via Bash):**
   - `npx tsc --noEmit 2>&1 | grep -c "error"` — type errors
   - If knip is available: `npx knip --no-progress 2>&1` — unused files, exports, dependencies

   **Python (via Bash):**
   - `ruff check --select F401,F811,F841 . 2>&1` — unused imports, vars, redefinitions

   **Test Coverage (via MCP):**
   - Call `mcp__test_coverage__get_total_coverage` for overall project coverage %
   - Call `mcp__test_coverage__get_uncovered_files` to find files with zero or low coverage

   **Dependency Health (via MCP):**
   - Call Socket MCP to scan installed packages for supply chain risks
   - Call Sonatype MCP to check for outdated/vulnerable package versions

   **General (via Bash):**
   - `grep -rn "throw new Error.*not implemented\|raise NotImplementedError\|TODO\|FIXME" .` — stubs

4. **Spawn verifier agent in quality mode** with:
   - All automated tool output (ESLint, tsc, knip/ruff, coverage, deps)
   - File list from scope
   - Instructions to find:
     - **Dead Code:** unused imports, unreachable branches, orphaned functions, unused exports
     - **Stubs:** empty function bodies, placeholder implementations, `pass` statements, `throw new Error("not implemented")`
     - **Duplicates:** similar logic (10+ lines) in multiple files, copy-paste patterns
     - **Debt:** TODO/FIXME without tracking, commented-out code blocks, magic numbers
     - **Low Coverage:** files/functions with <50% test coverage
     - **Unsafe Dependencies:** flagged packages from Socket/Sonatype

5. **Present categorized findings.**

6. **Offer cleanup options:**
   - "Clean all safe removals" — unused imports, dead exports (changes that can't break behavior)
   - "Show details for each" — explain each finding
   - "Dismiss" — accept as-is

7. **If cleaning:** remove safe items, then run build/test to confirm nothing broke.

8. **Persist report** to `.codebrain/reviews/{date}-quality-scan.md`.

## Quality Report Template

```markdown
# Quality Scan Report

**Scope:** [path or "full project"]
**Date:** [ISO date]
**Stack:** [auto-detected]

## Summary
| Category | Count | Severity |
|----------|-------|----------|
| Dead Code | 0 | Minor |
| Stubs | 0 | Major |
| Duplicates | 0 | Minor |
| Unused Dependencies | 0 | Minor |
| Low Coverage Files | 0 | Major |
| Unsafe Dependencies | 0 | Critical |

## Automated Tool Results
| Tool | Status | Output |
|------|--------|--------|
| ESLint | PASS/FAIL | [error count] |
| TypeScript | PASS/FAIL | [error count] |
| Knip/Ruff | PASS/FAIL | [unused count] |
| Coverage | N% | [threshold: 80%] |
| Socket | SAFE/WARN | [flagged count] |

## Findings

### Dead Code
| # | File:Line | Type | Description | Safe to Remove |
|---|-----------|------|-------------|----------------|
| 1 | src/old.ts:1-45 | Unused export | `formatLegacy()` has 0 callers | Yes |

### Stubs
| # | File:Line | Description |
|---|-----------|-------------|
| 1 | src/api.ts:88 | `throw new Error("not implemented")` |

### Duplicates
| # | File A | File B | Lines | Similarity |
|---|--------|--------|-------|------------|
| 1 | utils/format.ts:10-25 | helpers/fmt.ts:5-20 | 15 | 92% |

## Cleanup Classification
- **Safe (auto-removable):** unused imports, unreferenced exports, empty files
- **Needs Review:** stubs (may be intentional placeholders), low-coverage files
- **Manual Only:** duplicates (need architectural decision), unsafe deps (need replacement)
```
