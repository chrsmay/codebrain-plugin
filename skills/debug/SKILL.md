---
name: debug
description: "Use when something is broken, failing, hanging, erroring, or behaving unexpectedly. Systematic debugging workflow: reproduce → isolate → hypothesize → fix → verify. Prevents guessing and shotgun fixes. Also triggers on frustration signals like 'why isn't this working', 'it's broken', 'stuck'."
version: 1.0.0
metadata:
  priority: 8
  pathPatterns:
    - "**/*.log"
    - "**/error.ts"
    - "**/error.tsx"
    - "**/error.js"
    - "**/error.jsx"
    - "**/__tests__/**"
    - "**/*.test.ts"
    - "**/*.test.tsx"
    - "**/*.spec.ts"
    - "**/*.spec.tsx"
  bashPatterns:
    - "\\bnpm\\s+test\\b"
    - "\\bpnpm\\s+test\\b"
    - "\\bpytest\\b"
    - "\\bcurl\\s+-[vI]"
    - "\\btail\\s+-f\\b"
    - "\\bnode\\s+--inspect\\b"
  promptSignals:
    phrases:
      - "why is this failing"
      - "it's broken"
      - "not working"
      - "getting an error"
      - "bug in"
      - "debug this"
      - "fix this bug"
      - "stack trace"
      - "error message"
      - "unexpected behavior"
      - "something went wrong"
      - "TypeError"
      - "null reference"
      - "investigate this issue"
    allOf:
      - [fix, bug]
      - [debug, issue]
      - [not, working]
      - [error, when]
    anyOf:
      - "bug"
      - "error"
      - "debug"
      - "failing"
      - "broken"
      - "crash"
    noneOf:
      - "write a test"
      - "add test coverage"
  chainTo:
    - pattern: "Error:|TypeError:|ReferenceError:|SyntaxError:"
      targetSkill: verify
      message: "Error detected - verify the fix after debugging"
---

# CodeBrain Debug

Systematic debugging workflow. Diagnose before fixing. Evidence before assumptions.

## CRITICAL RULE

**Do NOT guess-and-fix.** The #1 failure mode of AI debugging is jumping to a fix without understanding the root cause. This skill enforces a structured process that prevents that.

## Usage

`/codebrain:debug [description of the problem]`

If no description provided, ask: "What's happening that shouldn't be? Or what's not happening that should be?"

## Workflow

### Phase 1: Understand the Symptom

1. **Capture the exact error.**
   - If there's an error message: read it carefully, note the file:line, the error type, and the stack trace
   - If there's unexpected behavior: get the user to describe expected vs. actual
   - If there's a hang/timeout: note what was happening when it stalled

2. **Check recent changes.**
   - Run `git log --oneline -10` — what changed recently?
   - Run `git diff --stat` — what's currently modified?
   - Has this ever worked? If yes, what changed since it last worked?

3. **Read the constitution and relevant specs.**
   - Load `.codebrain/memory/known-issues.md` — is this a known issue?
   - Load `.codebrain/memory/continuity.md` — what was done in the last session?

### Phase 2: Reproduce

4. **Confirm the bug is reproducible.**
   - Run the failing command/test via Bash
   - Capture the exact output
   - If it can't be reproduced: note that and adjust approach (intermittent bugs need different strategies)

5. **Narrow the scope.**
   - Can you reproduce with a simpler input?
   - Does it fail on a specific file, endpoint, or data?
   - Does it fail in isolation or only in combination?

### Phase 3: Isolate

6. **Trace the execution path.**
   - Use knowledge graph (`mcp__codebase_memory__trace_call_path`) to trace from the entry point to the failure
   - Read each file in the call chain
   - Identify where the actual behavior diverges from expected

7. **Check the blast radius.**
   - Use `mcp__code_review_graph__get_impact_radius_tool` on recently changed files
   - Were any of the files in the error's call chain recently modified?

8. **Binary search if needed.**
   - If the call chain is long, add diagnostic logging at the midpoint
   - Run again — does the error occur before or after the midpoint?
   - Repeat until isolated to a specific function/line

### Phase 4: Hypothesize (Present to User)

9. **Form exactly ONE hypothesis** about the root cause.
   - State it as: "The bug is caused by [X] in [file:line] because [evidence]"
   - Cite the evidence: error message, call trace, git diff, test output
   - If you have multiple possible causes, rank by likelihood and present the top one

10. **Ask the user before fixing.**
    - Present: the hypothesis, the evidence, and the proposed fix
    - Ask: "Does this match what you're seeing? Should I proceed with this fix?"
    - **Do NOT fix without user confirmation** — this prevents shotgun fixes

### Phase 5: Fix

11. **Apply the minimal fix.**
    - Change as few lines as possible to fix the root cause
    - Do NOT refactor surrounding code while fixing a bug
    - Do NOT add "improvements" — fix the bug and nothing else

12. **Follow constitution principles.**
    - Fail fast: if the fix adds error handling, it should be specific (not generic catch-all)
    - KISS: simplest fix that addresses the root cause
    - SRP: if the fix reveals a function doing too much, note it but don't refactor now

### Phase 6: Verify

13. **Reproduce the original failure — it should now pass.**
    - Run the same command from Phase 2 step 4
    - If it still fails: go back to Phase 3, your hypothesis was wrong

14. **Check for regressions.**
    - Run the full test suite
    - Run build
    - Check that the blast radius files still work

15. **Update memory.**
    - If this was a tricky bug, add to `.codebrain/memory/known-issues.md` with:
      - Symptom
      - Root cause
      - Fix applied
      - How to prevent recurrence
    - If this revealed a pattern, add to `.codebrain/memory/patterns.md`

### Phase 7: Prevent (Optional)

16. **Write a regression test** that specifically tests the scenario that was broken.
17. **If the root cause was a systemic issue** (not just a one-off typo), suggest a constitution principle or lint rule that would catch it in the future.

## Output Format

```markdown
# Debug Report

**Symptom:** [what went wrong]
**Root Cause:** [what caused it — file:line with evidence]
**Fix:** [what was changed]
**Regression Test:** [test name, if written]
**Prevention:** [suggested rule/pattern to prevent recurrence]
```

## Rules

- **Reproduce before hypothesizing.** No fix without evidence.
- **One hypothesis at a time.** Don't shotgun multiple fixes hoping one works.
- **Minimal fix.** Change as few lines as possible. Don't refactor during debugging.
- **Ask before fixing.** Present the hypothesis and get user confirmation.
- **Write it down.** Every non-trivial bug goes into known-issues.md for future reference.
- **Check the obvious first.** Typos, wrong variable names, missing imports — before deep analysis.
