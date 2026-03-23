---
name: plan
description: "Use when implementing a feature, fixing a bug, refactoring, or making any code change. Generates a structured plan with EARS criteria and [NEEDS CLARIFICATION] markers, executes it, then auto-verifies with spec reconciliation. The core Plan → Execute → Verify loop."
metadata:
  priority: 8
  pathPatterns:
    - ".codebrain/epics/**"
    - ".codebrain/active/**"
    - "**/PLAN.md"
    - "**/TODO.md"
    - "**/IMPLEMENTATION.md"
  bashPatterns:
    - "\\bgit\\s+checkout\\s+-b\\b"
    - "\\bgit\\s+branch\\b"
  promptSignals:
    phrases:
      - "plan the implementation"
      - "implementation plan"
      - "how should we implement"
      - "break this down"
      - "what's the approach"
      - "step by step plan"
      - "plan this feature"
      - "how would you architect"
      - "what files need to change"
    allOf:
      - [plan, implement]
      - [break, down]
      - [design, approach]
    anyOf:
      - "plan"
      - "approach"
      - "strategy"
      - "architect"
    noneOf:
      - "execute the plan"
      - "run the plan"
  chainTo:
    - pattern: "## Implementation Steps|## File Changes|## Plan Complete"
      targetSkill: verify
      message: "Plan created - verify against requirements after implementation"
---

# CodeBrain Plan

Single-task implementation planning with automatic verification. The core Plan → Execute → Verify workflow.

## Usage

`/codebrain:plan <task description>`

## Workflow

### Phase 0: Linear Context Loading (when linearSync is enabled)

Read `.codebrain/config.json` for `linearSync`, `linearProjectId`, and `linearIssueMap`.

If `linearSync` is `"required"` or `"optional"` (with Linear available):

1. **Identify the Linear issue for this task:**
   - If working on an epic ticket: look up the ticket slug in `linearIssueMap` to get the Linear issue ID
   - Call `get_issue` with the issue ID to load:
     - **Latest description** (may have been updated in Linear since last session)
     - **Current status** (if already "Done" → warn and stop; if "In Progress" → warn about concurrent work)
     - **Acceptance criteria** from the description
   - Call `list_comments` to load:
     - Clarifications from team members
     - Prior verification results
     - Any `[NEEDS CLARIFICATION]` resolutions posted as comments
   - If the Linear description differs from the local ticket file: **use the Linear version** (it's the source of truth)

2. **Update Linear status:**
   - Call `update_issue` to set status to "In Progress"
   - This signals to other sessions/agents that this ticket is being worked on

3. **Load the PRD from Linear (not local cache):**
   - Call `list_documents` for the project to find the PRD document
   - Call `get_document` to read the latest PRD
   - Use this for spec reconciliation later (Phase 4b)

### Phase 1: Context Loading
1. Call `mcp__codebrain__codebrain_memory_read` with `file: "all"` to load project memory.
2. **Read constitution** — `.codebrain/memory/constitution.md` is non-negotiable.
3. Call `mcp__codebrain__codebrain_config_read` to get project settings.
4. Read the project's conventions file (path from config, e.g., CLAUDE.md).

### Phase 1b: Codebase Intelligence (for large codebases)
If codebase-memory MCP is available:
5. Call `mcp__codebase_memory__get_architecture` to get the module map.
6. Call `mcp__codebase_memory__search_graph` with task keywords to find relevant code.
7. Call `mcp__codebase_memory__detect_changes` to check for recent modifications that might conflict.

### Phase 1c: API Research (if task involves API routes or third-party SDKs)
If the task description mentions API endpoints, SDKs, or third-party integrations:
8. Spawn the `api-researcher` agent with:
   - The task description
   - Which APIs/SDKs are involved
   - Instructions to fetch official docs via Context7, check versions, and return implementation guidance
9. The api-researcher returns: documentation source, correct patterns, version status, deprecated methods, and any `[NEEDS CLARIFICATION]` markers about API usage

### Phase 2: Planning
10. Spawn the `planner` agent with:
    - The user's task description (`$ARGUMENTS`)
    - **The constitution** (full text)
    - **API research results** (if Phase 1c was executed — official docs, correct patterns, version info)
    - Project memory context (continuity, architecture, patterns, known issues)
    - Knowledge graph context (architecture overview, relevant modules, recent changes)
    - Project conventions
    - Instructions to:
      - Use knowledge graph and LSP for navigation
      - Follow the API researcher's guidance for any API/SDK usage (do NOT guess API signatures)
      - Flag ALL ambiguities with `[NEEDS CLARIFICATION]` markers
      - Use EARS notation for verification criteria
      - Include constitution compliance check
      - Produce a structured plan with blast radius analysis

9. **Review the plan for `[NEEDS CLARIFICATION]` markers.**
   - If markers found: present each to the user and ask for resolution
   - Update the plan with resolved answers
   - Re-run planning only for affected sections if resolution changes scope
   - **Do NOT proceed to execution while any markers remain**

10. Present the plan to the user for approval.
    - If rejected: ask what to change, re-plan
    - If approved: proceed to execution

### Phase 3: Execution
11. Save the plan to `.codebrain/active/plan.md` via `mcp__codebrain__codebrain_artifact_write`.
12. Execute the plan step by step:
    - Read each target file before modifying
    - Apply changes using Edit (for modifications) or Write (for new files)
    - Follow the execution order from the plan
    - **Task recitation**: Before EACH implementation step, re-read the relevant verification criteria from the plan to stay anchored to the spec

### Phase 4: Verification
13. Invoke `/codebrain:verify .codebrain/active/plan.md` to run verification.
14. If verification fails with Critical/Major issues:
    - Fix the issues
    - Re-verify (max 3 cycles)
15. If verification passes: proceed to spec reconciliation.

### Phase 4b: Spec Reconciliation
16. **Compare implementation against the plan:**
    - Did you implement everything the plan specified?
    - Did you implement anything NOT in the plan? (scope creep detection)
    - Did any implementation detail differ from the plan?
17. For each divergence:
    - Add a `[SPEC_DEVIATION: plan says X, implementation does Y — reason: Z]` marker
    - Ask the user: update the plan to match, or fix the code?
18. If this plan was for an epic ticket, update the ticket's execution log.

### Phase 4c: Linear Post-Completion (when linearSync is enabled)

If Linear sync is active and this task maps to a Linear issue:

1. **Update issue status:**
   - If verification PASSED: call `update_issue` to set status to "Done"
   - If verification FAILED but within fix cycles: keep as "In Progress"
   - If verification FAILED after 3 cycles: set to "In Review" for manual attention

2. **Post completion comment:**
   - Call `create_comment` on the issue with:
     ```markdown
     ## Implementation Complete

     **Verification:** PASS/FAIL
     **Files changed:** [list of modified files]
     **Spec deviations:** [any SPEC_DEVIATION markers and their resolution]
     **Key decisions:** [decisions made during implementation]

     Executed by codebrain:plan on [date]
     ```

3. **Check for unblocked downstream tickets:**
   - If this ticket was blocking others (via Linear issue relations), those tickets are now unblocked
   - Note which tickets are now ready in the completion report

### Phase 5: Memory Update
19. Call `mcp__codebrain__codebrain_memory_update` for `continuity` with:
    - What was done (task summary)
    - Key decisions made during implementation
    - What's next (follow-up work identified)
    - Any `[SPEC_DEVIATION]` markers and their resolution
20. **Update CLAUDE.md** — If the plan introduced new tech decisions or patterns, append them to the project's conventions file so future sessions have context.
21. Report completion with verification results.

## Key Principles

- **Constitution is law.** Read it, follow it, justify any deviation.
- **`[NEEDS CLARIFICATION]` blocks execution.** Plans with unresolved markers cannot proceed.
- **Plan before code.** Never start editing without a plan.
- **Task recitation.** Re-read the spec objectives before each implementation step to prevent drift.
- **Spec reconciliation.** After implementation, diff against the plan and surface divergences.
- **EARS for acceptance criteria.** When/While/Where/If-Then-Otherwise format.
- **Reference existing patterns.** The planner agent must cite file:line for every claim.
- **Verify before claiming done.** Verification is not optional.
- **Update memory.** Every completed task updates continuity.
