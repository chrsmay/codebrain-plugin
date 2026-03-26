---
name: memory
description: "Use when initializing a project for codebrain, loading project context, updating memory after work, or resetting project knowledge. Subcommands: reset (initialize .codebrain/ with constitution), load (display memory), update (refresh from recent work)."
metadata:
  priority: 9
  pathPatterns:
    - ".codebrain/**"
    - ".codebrain/memory/**"
    - ".codebrain/epics/**"
    - ".codebrain/exports/**"
  bashPatterns:
    - "\\bgit\\s+log\\b.*--since"
    - "\\bgit\\s+diff\\b.*HEAD"
  promptSignals:
    phrases:
      - "what do you remember"
      - "what do you know about this project"
      - "project context"
      - "save this for later"
      - "remember this"
      - "what changed since"
      - "bring me up to speed"
      - "project history"
      - "what was decided"
      - "initialize codebrain"
    allOf:
      - [remember, project]
      - [context, project]
      - [save, memory]
    anyOf:
      - "memory"
      - "context"
      - "history"
      - "remember"
    noneOf: []
---

# CodeBrain Memory

Manage persistent project knowledge stored in `.codebrain/memory/`.

## Usage

`/codebrain:memory <subcommand>`

- `reset` — Initialize `.codebrain/` directory, auto-detect project stack, generate constitution, create memory files
- `load` — Display all current memory (constitution, continuity, architecture, patterns, known issues, decisions)
- `update` — Refresh memory from recent work (git log, completed tasks, discovered patterns)

## Subcommand: reset

1. Call `mcp__codebrain__codebrain_scaffold` to create the `.codebrain/` directory structure.

2. **Auto-detect the project:**
   - Read `package.json` → extract `scripts.build`, `scripts.test`, `scripts.lint`
   - Check for `pyproject.toml`, `Cargo.toml`, `go.mod` if no package.json
   - Find conventions file: check CLAUDE.md, AGENTS.md, README.md (in priority order)
   - Identify primary language(s) and frameworks

3. Call `mcp__codebrain__codebrain_config_write` with detected build/test/lint commands and conventions file path.

4. **Generate constitution** — Write `.codebrain/memory/constitution.md`:
   Ask the user 3-4 questions to establish project principles, OR generate defaults based on detected stack:

   ```markdown
   # Project Constitution

   > These principles are IMMUTABLE. Every skill, agent, and workflow references
   > this document. Violations must be justified in the Complexity Tracking table.
   > Code that violates non-negotiable principles will be REJECTED by verification.

   ## Workflow Principles

   1. **Spec before code.** No implementation without a written plan or spec.
   2. **Test-first.** Tests are written before or alongside implementation, never after.
   3. **No speculative features (YAGNI).** Only build what the spec requires. No "might need later."
   4. **[NEEDS CLARIFICATION] over guessing.** When uncertain, flag it. Never silently assume.
   5. **Design before UI code.** For frontend features, create a mockup or wireframe before implementing.

   ## SOLID Principles (Non-Negotiable)

   6. **Single Responsibility (SRP).** Every function does ONE thing. Every file has ONE purpose. Every module has ONE reason to change. If you can't describe what a function does without using "and," split it.
   7. **Open/Closed (OCP).** Extend behavior through composition, not by modifying existing functions. New features = new code, not changes to working code.
   8. **Liskov Substitution (LSP).** Subtypes must honor all contracts of their parent types. No overrides that change expected behavior.
   9. **Interface Segregation (ISP).** Keep interfaces small and focused. No client should depend on methods it doesn't use.
   10. **Dependency Inversion (DIP).** Business logic depends on abstractions, not concrete implementations. Inject dependencies; don't hardcode them.

   ## Code Simplicity (Non-Negotiable)

   11. **KISS — Simplest solution wins.** Favor the most direct implementation. If a junior developer can't understand it in 60 seconds, it's too complex.
   12. **DRY — No duplicate logic.** Every piece of knowledge has exactly one authoritative location. If you're copying code, extract it.
   13. **Flat over nested.** Use early returns and guard clauses. Max nesting depth: 3 levels. No exception.
   14. **Explicit over implicit.** No hidden side effects, no magic. Function names must accurately describe behavior.
   15. **Fail fast.** Validate inputs at function entry. Throw specific exceptions. NEVER swallow errors with empty catch blocks.
   16. **Existing patterns first.** Reuse what exists before creating something new. No premature abstraction — extract only on the third occurrence.

   ## Hard Limits (Non-Negotiable — Verification Will Reject Violations)

   | Metric | Limit | Rationale |
   |--------|-------|-----------|
   | Cyclomatic complexity per function | <= 10 | Higher = untestable |
   | Cognitive complexity per function | <= 15 | Higher = unreadable |
   | Function length | <= 50 lines (hard ceiling: 100) | Longer = doing too much |
   | File length | <= 300 lines (hard ceiling: 500) | Longer = multiple responsibilities |
   | Nesting depth | <= 3 levels | Deeper = hard to follow |
   | Function parameters | <= 4 (use options object beyond) | More = unclear interface |
   | Magic numbers/strings | 0 (use named constants) | Unexplained values = bugs |

   ## Forbidden Anti-Patterns

   - **God objects/files** — files that do everything. Split them.
   - **Deep inheritance** (>2 levels) — use composition instead.
   - **Silent error swallowing** — empty catch blocks, generic `catch(e) {}`.
   - **Shotgun surgery** — one change requiring edits in 5+ files means wrong abstraction boundaries.
   - **Copy-paste programming** — duplicate blocks across files. Extract shared logic.
   - **Long parameter lists** (>4 params) — use an options/config object.
   - **Feature envy** — a method using more data from another class than its own.
   - **Speculative generality** — abstract classes with one implementation.

   ## Stack-Specific Principles
   [Auto-generated based on detected stack — e.g., "Use Server Components by default" for Next.js]

   ## Complexity Tracking
   | Date | Principle Violated | Justification | Approved By |
   |------|-------------------|---------------|-------------|
   ```

5. Call `mcp__codebrain__codebrain_memory_update` for each memory file with initial content:
   - `constitution` — Generated above (this is the ONLY memory file that should rarely change)
   - `continuity` — "Project initialized on [date]. No work history yet."
   - `architecture` — Run Glob/Grep to identify project structure, write a brief architecture summary
   - `patterns` — "No patterns documented yet."
   - `known-issues` — "No known issues."
   - `decisions` — "No decisions recorded yet."

6. Suggest adding to `.gitignore`:
   ```
   .codebrain/active/
   .codebrain/reviews/
   ```

7. Report what was created and detected.

## Subcommand: load

1. Call `mcp__codebrain__codebrain_memory_read` with `file: "all"`.
2. Also read `.codebrain/memory/constitution.md` if it exists.
3. Display each memory file with a clear header. Skip empty files.
4. Highlight any `[NEEDS CLARIFICATION]` markers found across memory files.

## Subcommand: update

1. Run `git log --oneline --since="8 hours ago"` via Bash to see recent work.
2. Run `git diff --stat` to see uncommitted changes.
3. Call `mcp__codebrain__codebrain_memory_read` with `file: "all"` to get current memory.
4. Read the constitution to check for violations in recent work.
5. Analyze recent work and update each relevant memory file:
   - **continuity** — What was done, decisions made, what's next
   - **architecture** — Only if structural changes (new directories, new modules, changed boundaries)
   - **patterns** — Only if new patterns discovered or anti-patterns encountered
   - **known-issues** — Any new bugs, tech debt, TODOs found
   - **decisions** — Any architectural decisions made during the session
6. **Check for constitution violations** — If recent work violated a principle, add to Complexity Tracking table with justification.
7. Call `mcp__codebrain__codebrain_memory_update` for each file that changed.
8. Report what was updated.

## Subcommand: save-pattern (Blueprint Reuse — Stripe Minions Pattern)

Save a successful implementation as a reusable pattern for similar future tasks.

1. **Read the most recent plan** from `.codebrain/active/plan.md`.
2. **Read the verification report** from `.codebrain/active/verification.md`.
3. **Confirm the plan succeeded** — only save patterns from verified, passing implementations.
4. **Ask the user:** "What type of task is this? (e.g., 'new API endpoint', 'new React component', 'database migration', 'dependency upgrade')"
5. **Extract the pattern:**
   ```markdown
   ## Pattern: [task type]

   **Created:** [date]
   **Source:** [plan file path]
   **Verified:** Yes — [verification date]

   ### When to Use
   [Description of tasks this pattern applies to]

   ### File Template
   | Action | File Pattern | Template |
   |--------|-------------|----------|
   | Create | [path pattern] | [description of what goes in the file] |
   | Modify | [path pattern] | [what to change] |

   ### Implementation Steps
   [Generalized steps from the successful plan — replace specific names with [PLACEHOLDER]]

   ### Verification Criteria
   [Generalized EARS criteria from the successful verification]
   ```
6. **Append to `.codebrain/memory/patterns.md`** via MCP tools.
7. **Report:** "Pattern saved. Next time you ask for a similar task, the planner will use this as a starting template."

### How Patterns Are Used

When `/codebrain:plan` runs, Phase 1 Step 5 checks patterns.md for a matching pattern:
- If a pattern matches the task description, the planner receives it as a starting template
- The planner ADAPTS the pattern (fills in placeholders, adjusts for specifics) rather than planning from scratch
- This saves tokens and produces more consistent results across similar tasks
- The planner must still do blast radius analysis and constitution checks — patterns don't bypass safety
