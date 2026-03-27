---
name: epic
description: "Use when starting a large feature, managing multi-ticket work, or tracking specs/tickets/decisions. Subcommands: create (specs + tickets with EARS requirements and Given/When/Then acceptance criteria), work (next ticket), status (progress)."
version: 1.0.0
metadata:
  priority: 7
  pathPatterns:
    - ".codebrain/epics/**"
    - "**/EPIC.md"
  bashPatterns:
    - "\\bgit\\s+branch\\b.*epic"
    - "\\bgit\\s+branch\\b.*feature"
  promptSignals:
    phrases:
      - "create an epic"
      - "new epic"
      - "epic for"
      - "start a new feature"
      - "break into tickets"
      - "ticket breakdown"
      - "create tickets"
      - "manage this work"
    allOf:
      - [create, epic]
      - [break, tickets]
    anyOf:
      - "epic"
      - "tickets"
      - "multi-ticket"
    noneOf: []
  chainTo:
    - pattern: "## Tickets|## Breakdown|## Epic Created"
      targetSkill: plan
      message: "Epic tickets created - plan implementation"
---

# CodeBrain Epic

Multi-artifact workflow for large features. Manages specs, tickets, decisions, and tracks progress across sessions.

## Usage

`/codebrain:epic <subcommand> [args]`

- `create <name>` — Create a new epic with specs and tickets
- `work <slug>` — Work on the next ticket in an epic
- `status <slug>` — Show epic progress

## Recommended Workflow (Full Lifecycle)

Before creating an epic, consider running the full lifecycle:
1. `/codebrain:discover` — Validate the problem is worth solving
2. `/codebrain:prd` — Write the Product Requirements Document
3. `/codebrain:map-journeys` — Enumerate all user paths and edge cases
4. `/codebrain:epic create` — Generate tech specs and tickets from PRD + journeys
5. `/codebrain:epic work` — Implement tickets one by one
6. `/codebrain:launch` — Pre-launch checklist and rollout plan
7. `/codebrain:retro` — Post-launch retrospective and next iteration

You can start at any phase. But the further upstream you start, the fewer surprises downstream.

## Linear Integration (Mandatory when linearSync is enabled)

### Pre-Check
Read `.codebrain/config.json` for `linearSync` and `linearProjectId`.
- If `linearSync: "required"` and Linear MCP is NOT connected: **STOP** with auth message.
- If `linearSync: "required"` or `"optional"` (with Linear available): all subcommands sync with Linear.

### Linear as Source of Truth for Work Items
When Linear sync is active, Linear is the **canonical source** for:
- Issue status (not local ticket files)
- Issue comments (verification reports, clarifications)
- Issue relations (blocks/blocked-by dependencies)
- Project health (project updates)

Local `.codebrain/epics/` files become a **cache** for offline fallback.

### create — Linear Sync Steps

After generating specs and tickets locally (Step 7), perform these Linear operations:

1. **Check for existing project:**
   - Call `list_projects` filtering by epic name
   - If found: use existing project (resume, don't duplicate)
   - If not found: call `create_project` with name, description (from PRD overview)

2. **Store specs as Linear project documents:**
   - PRD → project document (if not already created by `/codebrain:prd`)
   - Tech spec → project document
   - Journey map → project document (if exists)

3. **Create Linear issues for each ticket:**
   - Call `create_issue` for each ticket with:
     - **Title**: ticket title
     - **Description**: full ticket content including Given/When/Then acceptance criteria in markdown
     - **Priority**: P0 tickets → 1 (Urgent), P1 → 2 (High), P2 → 3 (Medium)
     - **Labels**: `codebrain`, epic slug, ticket type (e.g., `feature`, `test`, `refactor`)
     - **parentId**: use a parent "epic" issue to group all tickets as sub-issues
   - Record the Linear issue ID in each local ticket file (append `linear_id: ISS-xxx`)

4. **Create issue relations for dependencies:**
   - For each `depends_on` in the ticket DAG:
     - The dependent ticket **is blocked by** its dependency
     - This maps to Linear's blocks/blocked-by relation
   - Blocked issues show a red flag in Linear until their blocker is resolved

5. **Create project milestones** (if tickets have execution phases):
   - Phase 1 tickets → Milestone "Foundation"
   - Phase 2 tickets → Milestone "Core Features"
   - Phase 3 tickets → Milestone "Polish & Testing"

6. **Save Linear metadata** to `.codebrain/config.json`:
   ```json
   {
     "linearProjectId": "proj_xxx",
     "linearTeamId": "team_xxx",
     "linearIssueMap": {
       "001-setup-database": "ISS-123",
       "002-create-api": "ISS-124"
     }
   }
   ```

### work — Linear Sync Steps

Before starting work on a ticket:

1. **Read from Linear first** (not local files):
   - Call `get_issue` with the ticket's Linear ID to get:
     - Current status (is it still Ready? Or already In Progress by another session?)
     - Latest description (may have been edited in Linear)
     - Comments (clarifications, prior verification results, team feedback)
   - If status is already "Done": skip this ticket, move to next
   - If status is "In Progress": warn user — may be in progress in another session

2. **Update Linear status:**
   - Call `update_issue` to set status to "In Progress" when starting
   - This prevents another session/agent from picking up the same ticket

3. **After completion:**
   - Call `update_issue` to set status to "Done" (or "In Review" if verification pending)
   - Call `create_comment` with execution summary:
     - What was implemented
     - Files changed
     - Any `[SPEC_DEVIATION]` markers
     - Verification result (pass/fail)

### status — Linear Sync Steps

1. Call `list_issues` filtered by the Linear project ID
2. Merge with local `.codebrain/` status (Linear is authoritative for status, local for file content)
3. Display unified view:
   - Progress: N/M issues Done
   - Board: Done | In Progress | Ready | Blocked (from Linear statuses)
   - Blocked issues: show which issues block them (from Linear relations)
   - Recent comments: last 3 comments across all issues

## Subcommand: create

1. **Read constitution.** Load `.codebrain/memory/constitution.md` — all generated artifacts must comply.

2. **Generate slug** from the epic name (lowercase, hyphens, no special chars).

2b. **Check for existing upstream artifacts:**
   - If `.codebrain/epics/{slug}/discovery.md` exists → load it (skip requirement questions)
   - If `.codebrain/epics/{slug}/prd.md` exists → load it (use PRD requirements directly)
   - If `.codebrain/epics/{slug}/journeys.md` exists → load it (incorporate edge cases into tickets)
   - If none exist: proceed with requirement questions as below. But suggest running `/codebrain:discover` and `/codebrain:prd` first.

3. **Ask requirements** — Ask 5-8 questions ONE AT A TIME. Do not batch questions. Wait for each answer before asking the next:
   - What problem does this solve? What's the current pain point?
   - Who are the users? What are their key workflows?
   - What are the hard constraints? (performance, security, compliance, budget)
   - What existing code is affected? Which modules/files?
   - What's the definition of done? When would you consider this complete?
   - Any non-functional requirements? (latency targets, uptime, accessibility)
   - Are there any approaches you've already considered and rejected?
   - What's the priority? Must-have vs. nice-to-have features?

   **After each answer**, if the answer is vague or raises new questions, ask a follow-up. Do NOT proceed until requirements are clear.

4. **Spawn planner agent** to generate spec artifacts using EARS notation:
   - `specs/prd.md` — Problem and outcomes
     - Requirements in EARS format: "When [trigger], the system shall [behavior]"
     - Each requirement labeled FR-001, FR-002, etc.
     - Any ambiguity MUST be marked `[NEEDS CLARIFICATION: description — option A | option B]`
   - `specs/tech.md` — Architecture and implementation approach
     - References to existing code patterns by file:line
     - Technology decisions with rationale
   - `specs/design.md` — User flows (only if UI work detected)
   - `specs/api.md` — API contracts (only if API work detected)
     - Endpoint signatures with request/response schemas

5. **Review for `[NEEDS CLARIFICATION]` markers.** Before proceeding to tickets:
   - Scan all generated specs for `[NEEDS CLARIFICATION]` markers
   - Present each marker to the user and ask for resolution
   - Update specs with the user's answers
   - Do NOT generate tickets until all markers are resolved

6. **API Research** (if epic involves API routes or third-party integrations):
   - Spawn `api-researcher` agent for each API/SDK referenced in the specs
   - Feed the researcher's output (correct patterns, version info, deprecated methods) into the ticket generation step
   - Ensure API-related tickets include the correct SDK method signatures from official docs

7. **Spawn planner agent again** to generate tickets with Given/When/Then acceptance criteria:
   - Each ticket gets:
     - Title and description
     - **Given/When/Then acceptance criteria** (not prose):
       ```
       Given [precondition]
       When [action]
       Then [expected result]
       ```
     - `depends_on` (references to other ticket IDs)
     - `execution_order` (1, 2, 3...)
     - `[P]` marker if the ticket can run in parallel with others
   - Tickets are scoped to 1-3 hours of work each
   - Dependencies form a valid DAG (no cycles)

7. **Write all artifacts** via MCP tools:
   - `mcp__codebrain__codebrain_artifact_write` for each spec and ticket
   - Create `epic.md` overview with title, status, summary
   - Create `decisions.md` with decisions from the requirement gathering phase

8. **Sync with Linear** (see "Linear Integration" section above for full details):
   - Execute all 6 Linear sync steps: check existing project, store docs, create issues, create relations, create milestones, save metadata
   - This is MANDATORY when `linearSync: "required"` in config

9. **Report** what was created — show the epic overview and ticket list.
   - If Linear synced: include Linear project URL

## Subcommand: work

1. **Read constitution** — hold principles in mind for all work.

2. **Load epic status** via `mcp__codebrain__codebrain_epic_status`.

3. **Spawn bart agent** to analyze state and recommend next ticket:
   - Which tickets are done?
   - Which are unblocked?
   - Any drift detected?
   - Bart receives ONLY summaries from previous executions, not full context (isolation).

4. **Present ticket board** (Done / In Progress / Ready / Blocked) and bart's recommendation.

5. **On ticket selection** (user confirms or picks different):
   - Read the ticket file for Given/When/Then acceptance criteria
   - Run `/codebrain:plan` scoped to that ticket's acceptance criteria

6. **After completion — Spec Reconciliation:**
   - Update ticket status to `done` in the ticket file
   - Record execution summary in `executions/` directory
   - **Diff implementation against spec**: Compare what was built against what the spec said. If they diverge:
     - Flag each divergence as `[SPEC_DEVIATION: spec says X, code does Y — reason: Z]`
     - Ask the user: "Should the spec be updated to match the code, or should the code be fixed?"
     - Update the spec or note the deviation in decisions.md
   - Ask bart to check for drift and recommend next steps

## Subcommand: status

1. Call `mcp__codebrain__codebrain_epic_status` with the epic slug.
2. Display formatted status:
   - Progress bar (N/M tickets done)
   - Ticket board (Done / In Progress / Ready / Blocked)
   - Specs list
   - Recent decisions
   - Any `[NEEDS CLARIFICATION]` markers still unresolved
   - Any `[SPEC_DEVIATION]` markers from recent work
   - Drift warnings from previous bart analysis

## File Structure

```
.codebrain/epics/{slug}/
├── epic.md              # Title, status, summary
├── specs/
│   ├── prd.md           # EARS requirements (FR-001, FR-002...) with [NEEDS CLARIFICATION] markers
│   ├── tech.md          # Architecture with file:line references
│   ├── design.md        # User flows (if applicable)
│   └── api.md           # API contracts (if applicable)
├── tickets/
│   ├── 001-ticket-name.md  # Given/When/Then acceptance criteria
│   ├── 002-ticket-name.md  # [P] marker if parallelizable
│   └── ...
├── executions/
│   └── 001-ticket-name-execution.md  # Includes [SPEC_DEVIATION] markers if any
└── decisions.md         # Epic-scoped decisions from requirements + implementation
```
