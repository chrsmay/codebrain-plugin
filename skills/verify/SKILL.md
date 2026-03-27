---
name: verify
description: "Use when checking if implementation matches a plan or spec, after completing code changes, before claiming work is done, or when you need to run build/test/lint checks. Checks EARS acceptance criteria, runs automated checks, detects spec deviations, categorizes issues by severity."
version: 1.0.0
metadata:
  priority: 7
  pathPatterns:
    - ".codebrain/epics/**"
    - ".codebrain/active/**"
    - "**/*.test.ts"
    - "**/*.test.tsx"
    - "**/*.test.js"
    - "**/*.test.jsx"
    - "**/*.spec.ts"
    - "**/*.spec.tsx"
    - "**/*.spec.js"
    - "**/*.spec.jsx"
  bashPatterns:
    - "\\bnpm\\s+run\\s+build\\b"
    - "\\bnpm\\s+run\\s+test\\b"
    - "\\bpnpm\\s+(run\\s+)?test\\b"
    - "\\btsc\\s+--noEmit\\b"
    - "\\bpytest\\b"
    - "\\bnpm\\s+run\\s+lint\\b"
  promptSignals:
    phrases:
      - "verify this works"
      - "does this meet the spec"
      - "check against requirements"
      - "validate the implementation"
      - "does this match the prd"
      - "is this correct"
      - "is it done"
      - "ready to ship"
      - "spec compliance"
    allOf:
      - [verify, spec]
      - [check, requirements]
      - [validate, implementation]
    anyOf:
      - "verify"
      - "validate"
      - "compliance"
    noneOf:
      - "write test"
      - "add test"
  chainTo:
    - pattern: "## Verification: PASS|Verdict.*PASS|All checks passed"
      targetSkill: launch
      message: "Verification passed - prepare for launch"
    - pattern: "## Verification: FAIL|CRITICAL:|BLOCKER:|Verdict.*FAIL"
      targetSkill: debug
      message: "Verification failed - debug the issues"
---

# CodeBrain Verify

Spec compliance and code quality verification. Checks implementation against a plan/spec, runs build/test/lint, detects spec-code divergence, and categorizes issues.

## Usage

`/codebrain:verify [path-to-spec]`

- If path provided: verify against that spec file
- If no path: verify against `.codebrain/active/plan.md`
- If neither exists: ask which file to verify against

## Workflow

1. **Load the spec.**
   - Read the target spec/plan file (argument or `.codebrain/active/plan.md`)
   - If no spec exists, ask the user what to verify against
   - Extract acceptance criteria — look for:
     - EARS format: "When X, the system shall Y"
     - Given/When/Then: "Given X, When Y, Then Z"
     - Checkbox items: `- [ ] criterion`
     - "must"/"should"/"returns" statements

2. **Load constitution and project config.**
   - Read `.codebrain/memory/constitution.md` — check for principle compliance
   - Call `mcp__codebrain__codebrain_config_read` to get build/test/lint commands
   - If commands not configured, try to auto-detect from package.json or equivalent

### Three-Tier Verification (Stripe Minions Pattern)

Run checks in order of speed and cost. Stop early if fast checks fail.

#### Tier 1: Fast Deterministic Checks (<5 seconds)
Run these BEFORE spawning any agents. These are deterministic — no LLM needed.

3. **Lint check** via ESLint MCP: `mcp__eslint__eslint_lint` on changed files only.
4. **Type check** via Bash: `npx tsc --noEmit 2>&1 | tail -20` (TypeScript) or `ruff check --select E,F . 2>&1 | tail -20` (Python).
5. **If Tier 1 fails:** Report lint/type errors immediately. Offer to fix before running expensive checks. Do NOT proceed to Tier 2 until Tier 1 passes (saves time and tokens).

#### Tier 2: Selective Test Execution (10-60 seconds)
6. **Identify changed files:** `git diff --name-only HEAD` or from the plan's file list.
7. **Run SELECTIVE tests** — only tests related to changed files:
   - TypeScript/Jest: `npx jest --findRelatedTests <changed-files> 2>&1 | tail -50`
   - Python/pytest: `pytest <changed-files-dirs> 2>&1 | tail -50`
   - If selective test detection is unavailable: run full suite as fallback
8. **Build check** via Bash: run the project's build command.
9. **If Tier 2 fails:** Report test/build failures. These are concrete — the agent gets ONE fix attempt (Tier 3).

#### Tier 3: Agentic Analysis (LLM-powered, expensive)
Only runs AFTER Tier 1 and Tier 2 complete. The agent receives all Tier 1+2 results as input.

10. **API verification** (if spec references API routes or third-party SDKs):
    - Spawn `api-researcher` agent for official docs verification
    - Feed findings into the verifier agent

11. **Spawn the verifier agent** with:
    - The full spec/plan text
    - The constitution text
    - **Tier 1 results** (lint/type check output — already passed or agent is fixing)
    - **Tier 2 results** (test/build output — passed or needs fixing)
    - **API researcher findings** (if step 10 was executed)
    - Extracted acceptance criteria as a checklist
    - Instructions to:
      a. Check test coverage via test-coverage MCP for changed files
      b. Check dependency safety via Socket + Sonatype MCP for any new packages
      c. **Check API correctness** — verify against api-researcher's guidance
      d. Read each file listed in the spec
      e. **Check each EARS/Given-When-Then criterion** as PASS/FAIL with file:line evidence
      f. **Detect spec deviations** — flag where implementation differs from spec
      g. **Check constitution compliance** — flag violations of project principles
      h. Categorize issues: Critical / Major / Minor
      i. Output a structured verification report

**Key principle:** The agent does NOT run build/test/lint — those already ran deterministically. The agent ANALYZES the results and checks semantic correctness that tools can't.

12. **Present the report.**
   - Show verdict: PASS or FAIL
   - Show automated check results (build/test/lint/coverage/deps)
   - Show acceptance criteria results (EARS/Given-When-Then format)
   - Show `[SPEC_DEVIATION]` markers with recommendations
   - Show constitution compliance status
   - Show categorized issues

5. **Handle failures.**
   - If Critical or Major issues found, offer:
     - "Fix all Critical+Major issues" → implement fixes, then re-verify (max 2 cycles)
     - "Fix specific issue" → fix one, re-verify
     - "Dismiss" → accept as-is
   - **For `[SPEC_DEVIATION]` markers** — ask the user:
     - "Update spec to match code" → update the spec artifact
     - "Fix code to match spec" → modify the implementation
     - "Document as intentional" → add to decisions.md with justification
   - Track fix cycles. After 2 attempts, stop and generate a **handoff summary**: what was completed, what failed, suggested manual fixes. Frame partial completion as a useful starting point, not a failure. (Stripe's Minions cap at 2 retries — diminishing returns beyond that.)

6. **Persist the report.**
   - Call `mcp__codebrain__codebrain_artifact_write` to save to `.codebrain/active/verification.md`

7. **Linear Sync** (when linearSync is enabled):

   Read `.codebrain/config.json` for `linearSync`, `linearProjectId`, `linearIssueMap`.

   If Linear sync is active:

   a. **Post verification report as a Linear comment:**
      - Identify the Linear issue for the verified ticket (from `linearIssueMap`)
      - Call `create_comment` with the verification report in markdown:
        ```markdown
        ## Verification Report — [date]

        **Verdict:** PASS / FAIL
        **Spec:** [spec file path]

        ### Automated Checks
        | Check | Result |
        |-------|--------|
        | Build | PASS/FAIL |
        | Tests | PASS/FAIL |
        | Lint | PASS/FAIL |

        ### Acceptance Criteria
        | # | Criterion | Result | Evidence |
        |---|-----------|--------|----------|
        | 1 | [criterion] | PASS/FAIL | [file:line] |

        ### Spec Deviations
        [any SPEC_DEVIATION markers]
        ```

   b. **Update issue status:**
      - If verdict is PASS: call `update_issue` to set status to "Done"
      - If verdict is FAIL (Critical): set status to "In Progress" (needs fix)
      - If verdict is FAIL after 2 fix cycles: set status to "In Review" (needs human attention)

   c. **Update spec deviations in Linear:**
      - For each `[SPEC_DEVIATION]` that the user chose to accept:
        - Update the Linear issue description to reflect the new spec
        - This keeps Linear as the source of truth for acceptance criteria

   d. **Flag unblocked tickets:**
      - If this ticket was blocking others, those are now unblocked
      - Call `list_issues` to find related blocked issues and note them in the report

## Verification Report Format

```markdown
# Verification Report

**Verdict:** PASS | FAIL
**Spec:** [path to spec file]
**Date:** [ISO date]
**Constitution:** COMPLIANT | [N] VIOLATIONS

## Automated Checks
| Check | Result | Details |
|-------|--------|---------|
| Build | PASS/FAIL | [output] |
| Tests | PASS/FAIL | [output] |
| Lint (ESLint) | PASS/FAIL | [error count, rule names] |
| Coverage | N% | [files below threshold] |
| Deps (Socket) | SAFE/WARN | [flagged packages] |
| Deps (Sonatype) | SAFE/WARN | [vulnerable versions] |

## Acceptance Criteria (EARS / Given-When-Then)
| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | When POST /users with valid payload, system shall return 201 | PASS | api/users.ts:42 |
| 2 | Given no auth token, When GET /profile, Then return 401 | FAIL | Returns 500 instead |

## Spec Deviations
- [SPEC_DEVIATION] spec:prd.md:23 says "paginated list (20 per page)" but code:api/users.ts:55 returns all records
  **Recommendation:** Update code (spec is intentional)

## Constitution Compliance
| Principle | Status | Notes |
|-----------|--------|-------|
| No speculation | OK | |
| Test-first | VIOLATED | Tests written after implementation |
| Existing patterns | OK | Reused existing auth middleware |

## Issues
### Critical
- ...

### Major
- ...

### Minor
- ...
```
