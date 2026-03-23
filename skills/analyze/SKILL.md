---
name: analyze
description: "Use when checking for stale artifacts, spec-code divergence, missing requirements, inconsistencies between specs and implementation, or cross-artifact conflicts. Detects drift, staleness, and gaps across all codebrain artifacts."
metadata:
  priority: 5
  pathPatterns:
    - ".codebrain/epics/**"
    - ".codebrain/exports/**"
    - ".codebrain/active/**"
  promptSignals:
    phrases:
      - "cross check the artifacts"
      - "consistency check"
      - "are these aligned"
      - "do these match"
      - "analyze for gaps"
      - "find inconsistencies"
      - "spec drift"
    allOf:
      - [check, consistency]
      - [analyze, artifacts]
    anyOf:
      - "analyze"
      - "consistency"
      - "alignment"
      - "drift"
    noneOf: []
---

# CodeBrain Analyze

Cross-artifact consistency analysis. Finds stale specs, spec-code divergence, missing requirements, conflicting tickets, and unresolved `[NEEDS CLARIFICATION]` markers.

## Usage

`/codebrain:analyze [epic-slug]`

- If epic slug provided: analyze that epic's artifacts
- If no argument: analyze `.codebrain/active/plan.md` and any active epic

## What It Checks

### 1. Unresolved Clarifications
Scan ALL artifacts (specs, tickets, plans, decisions) for `[NEEDS CLARIFICATION]` markers.
These MUST be resolved before implementation proceeds. List each with its location.

### 2. Spec-Code Divergence (Stale Artifacts)
For each spec file, check whether the code still matches:
- Read the spec's requirements and acceptance criteria
- Read the actual implementation files referenced in the spec
- Flag where implementation has diverged from spec (e.g., spec says "returns 404" but code returns 400)
- Use knowledge graph (`mcp__codebase_memory__search_graph`) to find code related to spec topics
- Output: `[SPEC_DEVIATION]` markers showing exact divergences

### 3. Coverage Gaps
For each requirement in specs:
- Is there a ticket that implements it?
- Is there code that addresses it?
- Is there a test that verifies it?
- Flag requirements with no implementation or no tests as "uncovered"

### 4. Ticket Consistency
For tickets in an epic:
- Do all ticket dependencies form a valid DAG? (no cycles)
- Are `depends_on` references pointing to real tickets?
- Are execution_order values consistent with dependencies?
- Do any tickets have overlapping scope? (same files modified by multiple tickets)

### 5. Constitution Compliance
Read `.codebrain/memory/constitution.md` and check:
- Do specs follow constitution principles? (e.g., no speculative features)
- Do plans follow constitution principles? (e.g., test-first ordering)
- Are there entries in the Complexity Tracking table that need review?

### 6. Decision Staleness
Read `.codebrain/memory/decisions.md` and epic decision files:
- Are there decisions referencing code that has since changed?
- Are there decisions that contradict each other?
- Are there decisions that were never implemented?

## Workflow

1. **Gather all artifacts.**
   - If epic slug: read all files in `.codebrain/epics/{slug}/`
   - Also read `.codebrain/active/plan.md`, `.codebrain/memory/constitution.md`, `.codebrain/memory/decisions.md`

2. **Scan for `[NEEDS CLARIFICATION]` markers** across all gathered files.

3. **Check spec-code alignment.**
   - For each spec, identify the implementation files it references
   - Read those files and compare against spec requirements
   - Use knowledge graph for large codebases to find related code
   - Flag divergences as `[SPEC_DEVIATION]`

4. **Check coverage gaps.**
   - Map: requirement → ticket → code file → test file
   - Flag any broken link in the chain

5. **Check ticket consistency.**
   - Validate dependency DAG
   - Check for scope overlap

6. **Check constitution compliance.**

7. **Check decision staleness.**

8. **Present the analysis report.**

## Output Format

```markdown
# Consistency Analysis

**Date:** [ISO date]
**Scope:** [epic slug or "active plan"]
**Health:** HEALTHY | NEEDS ATTENTION | CRITICAL

## Unresolved Clarifications
- [ ] [file:line] — [the NEEDS CLARIFICATION text]

## Spec Deviations
- [SPEC_DEVIATION] [spec-file:line] says "[spec text]" but [code-file:line] does "[actual behavior]"
  **Recommendation:** Update spec | Update code | Investigate

## Coverage Gaps
| Requirement | Ticket | Code | Test | Status |
|-------------|--------|------|------|--------|
| FR-001: ... | 001 | src/auth.ts | tests/auth.test.ts | Covered |
| FR-002: ... | — | — | — | **UNCOVERED** |

## Ticket Issues
- [issue description]

## Constitution Violations
- [violation description with Complexity Tracking recommendation]

## Stale Decisions
- [decision that no longer matches code]

## Recommendations
1. [Most important action]
2. [Second priority]
3. ...
```

## When to Run

- **Before starting a new ticket** in an epic — ensure specs are still accurate
- **After completing a ticket** — check for drift introduced during implementation
- **Periodically** during long sessions — catch staleness early
- **Before creating a PR** — final consistency check
