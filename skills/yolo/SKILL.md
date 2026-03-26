---
name: yolo
description: "Use when you want fully automated Plan → Execute → Verify with auto-commit. Uses task recitation to prevent drift, circuit breakers for safety, and fresh context per task. Pauses on Critical issues and unresolved [NEEDS CLARIFICATION] markers."
metadata:
  priority: 7
  pathPatterns:
    - ".codebrain/epics/**"
    - ".codebrain/active/**"
  promptSignals:
    phrases:
      - "just do it"
      - "yolo mode"
      - "auto pilot"
      - "execute everything"
      - "build this end to end"
      - "implement and commit"
      - "ship it"
      - "make it happen"
      - "full auto"
    allOf:
      - [implement, commit]
      - [build, ship]
    anyOf:
      - "yolo"
      - "autopilot"
      - "auto-pilot"
    noneOf:
      - "plan only"
      - "review first"
  chainTo:
    - pattern: "## Committed:|## Implementation Complete"
      targetSkill: verify
      message: "Auto-implementation complete - verify result"
---

# CodeBrain YOLO

Fully automated Plan → Execute → Verify pipeline with drift prevention. Plans, implements, verifies, and commits — pausing on Critical issues and ambiguities.

## Usage

`/codebrain:yolo <task description>`
`/codebrain:yolo epic <slug>` — work through all tickets in an epic
`/codebrain:yolo resume` — resume a paused run

## Safety Rails (non-negotiable)

- Git commit after every successful plan+implement+verify cycle
- Max 2 fix attempts per issue before pausing (Stripe Minions pattern: diminishing returns beyond 2)
- **Critical issues always pause** — never auto-fix Critical
- **`[NEEDS CLARIFICATION]` markers always pause** — never guess
- **`[SPEC_DEVIATION]` markers always pause** — user decides spec vs code
- Build and test run in every verification cycle
- Never force-push, delete files outside scope, or modify git history
- Full state saved on pause for clean resume
- **Circuit breaker**: If a single task exceeds 2x expected token budget, pause and report

## Drift Prevention Mechanisms

### 1. Task Recitation
Before EVERY implementation step, re-read the acceptance criteria for the current task from the plan. This pushes the spec into the model's recent attention window, preventing "lost-in-the-middle" drift.

### 2. Fresh Context Per Task (Epic mode)
Each ticket in an epic is executed with a FRESH planner agent invocation. The planner receives:
- ONLY the current ticket's spec and acceptance criteria
- The constitution
- Relevant memory (architecture, patterns)
- Summaries of completed tickets (NOT full execution context)

This prevents context poisoning from accumulated execution history.

### 3. Constitution Anchoring
The constitution is included in EVERY planner and verifier invocation. Non-negotiable principles stay in context throughout the entire run.

### 4. Spec Reconciliation After Each Task
After each task completes, verify checks for `[SPEC_DEVIATION]` markers. Any deviation pauses the run for user review.

## Workflow: Single Task

1. **Load context.**
   - Read project memory, constitution, and config via MCP tools
   - Read conventions file

2. **Plan** (no user approval needed).
   - Spawn `planner` agent with task description + constitution + context
   - Save plan to `.codebrain/active/plan.md`
   - **If plan contains `[NEEDS CLARIFICATION]` markers: PAUSE immediately**
   - Present markers to user, wait for resolution before continuing

3. **Execute** (with task recitation).
   - For each implementation step:
     a. **Re-read the relevant verification criteria** from the plan (task recitation)
     b. Read target file before modifying
     c. Implement the change
     d. **Circuit breaker check**: If accumulated changes exceed 2x the plan's estimated scope, pause

4. **Verify.**
   - Invoke `/codebrain:verify .codebrain/active/plan.md`
   - If PASS with no deviations: proceed to commit
   - If Minor issues only: auto-fix, re-verify
   - If Major issues: auto-fix if config allows (default: no), else pause
   - If Critical issues: **always pause**
   - If `[SPEC_DEVIATION]` found: **always pause** — user decides
   - Max 2 fix+verify cycles, then generate **handoff summary** and pause. The summary includes: what was completed, what failed, what the human should manually fix. Partial completion is a useful starting point, not a failure.

5. **Commit.**
   - `git add` changed files (specific files, not `git add .`)
   - `git commit` with descriptive message referencing the plan

6. **Update memory.**
   - Update continuity via MCP tools
   - Note any decisions made, deviations resolved

## Workflow: Epic (Fresh Context Isolation)

1. Read constitution.
2. Call `mcp__codebrain__codebrain_epic_status` to get ticket list.
3. Spawn `bart` agent to determine ticket execution order and identify parallel candidates.
4. For each ticket (in dependency order):
   a. **Fresh planner invocation** — spawn planner with ONLY:
      - This ticket's acceptance criteria (Given/When/Then)
      - The constitution
      - Architecture memory and relevant patterns
      - **Summaries** of completed tickets (not full context)
   b. Run the single-task workflow above scoped to the ticket
   c. Update ticket status to `done`
   d. Record execution summary in `.codebrain/epics/{slug}/executions/`
   e. **Spec reconciliation** — check for `[SPEC_DEVIATION]` between ticket spec and implementation
   f. Spawn bart to check for drift before next ticket
5. If drift detected: pause and report. User decides whether to update specs or fix code.
6. If `[P]` parallel tickets are available: note them but execute sequentially (parallel requires user opt-in).

## Workflow: Resume

1. Read `.codebrain/active/yolo-state.json` via MCP tools.
2. Identify where the run paused:
   - `[NEEDS CLARIFICATION]` marker? → show the marker, ask user to resolve
   - `[SPEC_DEVIATION]`? → show the deviation, ask user to decide
   - Critical issue? → show the issue, ask how to fix
   - Circuit breaker? → show what happened, ask whether to continue
3. On confirmation: continue from the paused point with fresh context.

## State File Format

`.codebrain/active/yolo-state.json`:
```json
{
  "workflow_id": "active",
  "type": "yolo",
  "phase": "verify",
  "completed_phases": ["plan", "execute"],
  "pending_phases": ["commit", "memory-update"],
  "current_task": "Add input validation to /api/users endpoint",
  "pause_reason": "SPEC_DEVIATION | NEEDS_CLARIFICATION | CRITICAL_ISSUE | CIRCUIT_BREAKER",
  "pause_details": "Spec says return 404 but implementation returns 400",
  "metadata": {
    "fix_attempts": 2,
    "last_error": "Test failure: expected 422, got 500",
    "committed_tasks": ["task-1", "task-2"],
    "epic_slug": null,
    "token_budget": 50000,
    "tokens_used": 42000
  },
  "updated_at": "2026-03-21T15:30:00Z"
}
```

## Config Options

Read from `.codebrain/config.json` under `yolo`:
- `auto_fix_minor: true` — auto-fix Minor issues without asking
- `auto_fix_major: false` — pause on Major issues (set true for more aggressive mode)
- `max_fix_attempts: 2` — max fix+verify cycles before pausing (default reduced from 3 per Stripe Minions pattern)
