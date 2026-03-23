---
name: verify
description: "Use when checking if implementation matches a plan or spec, after completing code changes, before claiming work is done, or when you need to run build/test/lint checks. Checks EARS acceptance criteria, runs automated checks, detects spec deviations, categorizes issues by severity."
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

3. **API verification** (if spec references API routes or third-party SDKs):
   - Spawn `api-researcher` agent to verify:
     a. Are the correct SDK method signatures used? (check against official docs)
     b. Are any deprecated methods being called?
     c. Are HTTP status codes correct? (201 for create, 404 for not found, etc.)
     d. Is error response format consistent across all endpoints?
     e. Is authentication handled correctly per the provider's docs?
   - Feed API researcher's findings into the verifier agent

4. **Spawn the verifier agent** with:
   - The full spec/plan text
   - The constitution text
   - **API researcher findings** (if step 3 was executed)
   - Extracted acceptance criteria as a checklist
   - Instructions to:
     a. Run build command via Bash (if configured)
     b. Run test command via Bash (if configured)
     c. Run ESLint via MCP for structured lint results
     d. Check test coverage via test-coverage MCP for changed files
     e. Check dependency safety via Socket + Sonatype MCP for any new packages
     f. **Check API correctness** — verify against api-researcher's guidance (deprecated methods = Major, wrong status codes = Major, wrong auth = Critical)
     g. Read each file listed in the spec
     h. **Check each EARS/Given-When-Then criterion** as PASS/FAIL with file:line evidence
     i. **Detect spec deviations** — flag where implementation differs from spec:
        - `[SPEC_DEVIATION]` markers for each divergence
        - Include: what spec says, what code does, which is correct
     i. **Check constitution compliance** — flag violations of project principles
     j. Categorize issues: Critical / Major / Minor
     k. Output a structured verification report

4. **Present the report.**
   - Show verdict: PASS or FAIL
   - Show automated check results (build/test/lint/coverage/deps)
   - Show acceptance criteria results (EARS/Given-When-Then format)
   - Show `[SPEC_DEVIATION]` markers with recommendations
   - Show constitution compliance status
   - Show categorized issues

5. **Handle failures.**
   - If Critical or Major issues found, offer:
     - "Fix all Critical+Major issues" → implement fixes, then re-verify (max 3 cycles)
     - "Fix specific issue" → fix one, re-verify
     - "Dismiss" → accept as-is
   - **For `[SPEC_DEVIATION]` markers** — ask the user:
     - "Update spec to match code" → update the spec artifact
     - "Fix code to match spec" → modify the implementation
     - "Document as intentional" → add to decisions.md with justification
   - Track fix cycles. After 3 attempts, stop and report remaining issues.

6. **Persist the report.**
   - Call `mcp__codebrain__codebrain_artifact_write` to save to `.codebrain/active/verification.md`

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
