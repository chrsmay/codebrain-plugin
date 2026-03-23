---
name: review
description: "Use when reviewing code for bugs, performance issues, security vulnerabilities, or quality problems. Deep agentic review that reads full files and traces imports, not just diffs. Categorizes by severity."
metadata:
  priority: 5
  pathPatterns:
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.js"
    - "**/*.jsx"
    - "**/*.py"
    - "**/*.rs"
    - "**/*.go"
  bashPatterns:
    - "\\bgit\\s+diff\\b"
    - "\\bgit\\s+log\\s+--oneline\\b"
  promptSignals:
    phrases:
      - "review this code"
      - "code review"
      - "review my changes"
      - "any issues with this"
      - "review the pr"
      - "pull request review"
      - "check this code"
      - "look at this code"
    allOf:
      - [review, code]
      - [review, changes]
      - [check, code, quality]
    anyOf:
      - "review"
      - "code review"
      - "PR"
    noneOf:
      - "design review"
      - "spec review"
---

# CodeBrain Review

Agentic code review with severity ratings. Reviews full files (not just diffs), traces imports, and categorizes findings.

## Usage

`/codebrain:review [path]`

- If path provided: review that specific file or directory
- If no path: review all uncommitted changes (git diff)
- On a feature branch: review all changes vs. main

## Workflow

1. **Determine scope.**
   - If argument provided: use that path
   - If on a feature branch: `git diff --name-only main...HEAD`
   - Otherwise: `git diff --name-only HEAD` + `git diff --name-only --staged`
   - If no changes found: ask what to review

2. **Read project conventions.**
   - Call `mcp__codebrain__codebrain_config_read` for project settings
   - Read conventions file (CLAUDE.md or equivalent)

3. **Analyze blast radius** (for large codebases).
   - If code-review-graph MCP is available:
     - Call `mcp__code_review_graph__get_impact_radius_tool` for each changed file
     - Call `mcp__code_review_graph__get_review_context_tool` to load optimal review context
   - If codebase-memory MCP is available:
     - Call `mcp__codebase_memory__trace_call_path` for changed functions to find all consumers
   - Add blast radius files to the review scope

4. **Spawn the verifier agent in review mode** with:
   - List of files to review (including blast radius files)
   - Blast radius analysis results
   - Instructions to:
     a. Read each file in full (not just the diff — context matters)
     b. Use knowledge graph to trace callers and consumers of changed interfaces
     c. Check blast radius files for regressions (broken imports, changed contracts)
     d. Categorize findings as: Bug, Performance, Security, Clarity
     e. Assign severity: Critical, Major, Minor
     f. Provide fix suggestions for each finding
     g. Reference file:line for every finding

4. **Present the review report.**
   - Organized by severity (Critical first)
   - Each finding with category, file:line, description, and fix suggestion

5. **Offer fix options.**
   - "Fix all Critical+Major" → implement fixes, then re-review changed files only
   - "Fix specific issue" → fix one finding
   - "Dismiss" → accept as-is

6. **Persist the review.**
   - Save to `.codebrain/reviews/{date}-{branch-or-scope}.md` via MCP tools

## What Makes This Different from a Diff Review

- Reads **full files**, not diffs — catches issues in the surrounding context
- **Traces imports** — reads referenced modules to verify API contracts
- Checks against **project conventions** — catches style/pattern violations
- Categories are **actionable** — Bug/Performance/Security/Clarity, not vague "suggestion"

## Review Checklist

### Component Structure
- [ ] One component per file (with co-located helpers)
- [ ] Named exports preferred over default exports
- [ ] Props interface defined with TypeScript
- [ ] Props destructured in function signature
- [ ] Component name matches file name

### Hooks & State
- [ ] Hooks called at top level (not in conditionals/loops)
- [ ] Custom hooks extract reusable logic
- [ ] Dependency arrays are complete and correct
- [ ] useCallback/useMemo used for expensive computations, not everywhere
- [ ] No state synchronization (derive, don't sync)

### Accessibility
- [ ] Semantic HTML elements used (button, nav, main, not div for everything)
- [ ] Alt text on images
- [ ] Keyboard navigation works
- [ ] ARIA attributes where needed
- [ ] Form labels associated with inputs

### Performance
- [ ] No inline object/array literals in JSX props
- [ ] Lists have stable keys (not array index)
- [ ] Large lists use virtualization
- [ ] Images use next/image or equivalent
- [ ] No unnecessary re-renders from parent state changes

### Security
- [ ] No dangerouslySetInnerHTML without sanitization
- [ ] User input validated before use
- [ ] No secrets in client-side code
- [ ] SQL/NoSQL queries parameterized
- [ ] API routes check authentication/authorization

### TypeScript
- [ ] No `any` types (use `unknown` if truly unknown)
- [ ] Return types on exported functions
- [ ] Discriminated unions for complex state
- [ ] `as const` for literal types

## Review Report Template

```markdown
# Code Review Report

**Scope:** [files reviewed]
**Date:** [ISO date]
**Branch:** [branch name]

## Summary
| Category | Critical | Major | Minor |
|----------|----------|-------|-------|
| Bug | 0 | 0 | 0 |
| Performance | 0 | 0 | 0 |
| Security | 0 | 0 | 0 |
| Clarity | 0 | 0 | 0 |

## Findings

### Critical
_None_

### Major
| # | Category | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 1 | Bug | src/api.ts:42 | ... | ... |

### Minor
| # | Category | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 1 | Clarity | src/utils.ts:15 | ... | ... |
```
