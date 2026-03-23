---
name: refactor
description: "Use when restructuring code without changing behavior — extracting functions, splitting files, renaming, reorganizing modules, reducing complexity, or cleaning up debt. Ensures behavior is preserved through snapshot testing before and after. Not for bug fixes or features."
---

# CodeBrain Refactor

Safe refactoring workflow. Change structure, preserve behavior. Test before AND after.

## CRITICAL RULE

**Refactoring = same behavior, different structure.** If the behavior changes, it's not a refactoring — it's a feature or bug fix. Use `/codebrain:plan` for those instead.

## Usage

`/codebrain:refactor <what to refactor>`

Examples:
- `/codebrain:refactor split auth.ts into separate modules`
- `/codebrain:refactor extract duplicate validation logic`
- `/codebrain:refactor reduce complexity in processOrder function`

## Workflow

### Phase 1: Understand What Exists

1. **Read the constitution.** Refactoring should move code TOWARD constitution compliance, not away from it.

2. **Analyze the target code.**
   - Read the file(s) to be refactored
   - Use knowledge graph (`mcp__codebase_memory__search_graph`) to understand how the target connects to the rest of the system
   - Use `mcp__code_review_graph__get_impact_radius_tool` to identify the blast radius

3. **Identify the specific problem.** What makes the current structure bad?
   - File too long (>300 lines)?
   - Function too complex (cyclomatic >10)?
   - Deep nesting (>3 levels)?
   - Duplicated logic across files?
   - God object (multiple responsibilities)?
   - Tight coupling (high blast radius)?

4. **Identify the behavioral contract.**
   - What are the public functions/exports?
   - What are their inputs and outputs?
   - What side effects do they have?
   - These must NOT change after refactoring.

### Phase 2: Snapshot (Behavior Baseline)

5. **Run existing tests.**
   - `npm test` / `pytest` — record pass/fail state
   - If tests exist for the target code: great, they're the behavioral contract
   - If NO tests exist for the target code: **write characterization tests first** before refactoring
     - Characterization tests capture CURRENT behavior (even if imperfect)
     - They answer: "what does this code actually do right now?"

6. **Run build + lint.**
   - Record current state so we can compare after refactoring

7. **Save snapshot** to `.codebrain/active/refactor-snapshot.md`:
   ```markdown
   # Refactor Snapshot
   **Target:** [file(s)]
   **Tests:** [N passing, M failing] (before refactoring)
   **Build:** PASS/FAIL
   **Public API:** [list of exported functions/types that must not change]
   ```

### Phase 3: Plan the Refactoring

8. **Generate refactoring plan.** Spawn `planner` agent with:
   - The target code
   - The behavioral contract (public API, tests)
   - The specific problem being fixed
   - Constitution compliance goals
   - Instruction: "propose structural changes that preserve ALL existing behavior"

9. **Plan must include:**
   - Exact file splits, renames, or extractions
   - Which imports will change across the codebase
   - Step-by-step execution order
   - **Behavioral invariants:** "These functions must continue to return the same values for the same inputs"

10. **Present plan for approval.** If the plan changes any public API signatures, that's a **breaking change** — flag it and get explicit user approval.

### Phase 4: Execute (Small Steps)

11. **Execute ONE refactoring step at a time.**
    - After each step, run the test suite
    - If tests fail: **revert that step** and try a different approach
    - If tests pass: commit the step (`git add && git commit -m "refactor: [step description]"`)

12. **Common refactoring operations:**
    - **Extract function:** Pull logic into a named function. Original calls the new function.
    - **Extract file/module:** Move functions to a new file. Update all imports.
    - **Inline:** Replace a function call with its body (opposite of extract).
    - **Rename:** Change a name everywhere. Use LSP find-all-references.
    - **Reduce nesting:** Convert nested if/else to early returns/guard clauses.
    - **Split responsibility:** Break a God file into focused modules.

### Phase 5: Verify (Behavior Preserved)

13. **Run the full test suite.** Compare against Phase 2 snapshot:
    - Same number of passing tests? (No regressions)
    - Same number of failing tests? (Didn't accidentally fix something — that would mean behavior changed)
    - No new failures? (No regressions)

14. **Run build + lint.** Compare against snapshot.

15. **Run `/codebrain:quality`** on the refactored files to confirm improvement:
    - Is cyclomatic complexity lower?
    - Are files shorter?
    - Is nesting depth reduced?
    - Are there fewer duplicates?

16. **Check public API preserved.**
    - Are all previously-exported functions still exported with the same signatures?
    - If any changed: flag as `[BREAKING_CHANGE]` and confirm with user

17. **Invoke `/codebrain:verify`** against the refactor snapshot to confirm behavioral equivalence.

### Phase 6: Clean Up

18. **Update imports across the codebase.** If files were split or renamed, ensure all consumers are updated.

19. **Delete the refactor snapshot.** It served its purpose.

20. **Update memory.**
    - If the refactoring revealed a pattern, add to `.codebrain/memory/patterns.md`
    - Update `.codebrain/memory/architecture.md` if module boundaries changed
    - Update `.codebrain/memory/continuity.md` with what was refactored and why

## Rules

- **Tests before touching code.** If no tests exist, write characterization tests first.
- **One step at a time.** Commit after each successful step. Revert on failure.
- **Same behavior, different structure.** If tests change, it's not a pure refactoring.
- **No features during refactoring.** Don't add functionality. Don't fix bugs. Just restructure.
- **Measure improvement.** Run quality scan before and after to prove the refactoring helped.
- **Small blast radius.** Prefer many small refactorings over one big bang rewrite.
