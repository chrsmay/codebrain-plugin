---
name: prd
description: "Use after /codebrain:discover to write a Product Requirements Document. Generates a structured PRD (<1200 words) with P0/P1/P2 requirements, user stories, success metrics, and non-goals. Validates against anti-patterns. Every P0 requirement traces to a user need. Outputs machine-readable acceptance criteria for AI agents."
metadata:
  priority: 7
  pathPatterns:
    - ".codebrain/epics/**"
    - "**/PRD.md"
    - "**/REQUIREMENTS.md"
    - "**/SPEC.md"
  promptSignals:
    phrases:
      - "write a prd"
      - "product requirements"
      - "requirements document"
      - "define the requirements"
      - "spec this out"
      - "write the spec"
      - "acceptance criteria"
      - "user stories"
    allOf:
      - [product, requirements]
      - [write, spec]
      - [acceptance, criteria]
    anyOf:
      - "prd"
      - "requirements"
      - "specification"
    noneOf:
      - "implement"
      - "code this"
  chainTo:
    - pattern: "## Requirements|## Acceptance Criteria|## User Stories"
      targetSkill: map-journeys
      message: "PRD created - map user journeys next"
---

# CodeBrain PRD

Product Requirements Document generation. Defines WHAT to build and WHY — never HOW.

## Usage

`/codebrain:prd [feature name]`
`/codebrain:prd from-discovery` — generate PRD from an existing discovery document

## Prerequisite

Run `/codebrain:discover` first. If no discovery document exists, ask: "Should we run discovery first, or do you have enough context to write the PRD directly?"

## Workflow

### Step 1: Load Context

1. Read `.codebrain/memory/constitution.md` — PRD must align with project principles.
2. Read the discovery document (`.codebrain/epics/{slug}/discovery.md` or `.codebrain/active/discovery.md`).
3. Read `.codebrain/memory/architecture.md` — understand what already exists.

### Step 2: Clarify Requirements

If discovery is complete, extract requirements from it. If not, ask these questions ONE AT A TIME:

1. **In one sentence, what does this feature do?**
2. **What are the 2-3 most important user stories?** (As a [user], I want [capability] so that [benefit])
3. **What are the hard constraints?** (Performance targets, security requirements, platform limitations)
4. **What is explicitly OUT of scope?** (Must list at least 3 non-goals)
5. **How will you measure success?** (Specific numbers: "page load <2s", "90% task completion rate")

### Step 3: Generate PRD

Output a structured PRD with exactly 7 sections, under 1,200 words total:

```markdown
# PRD: [Feature Name]

**Author:** [user name]
**Date:** [today]
**Status:** Draft
**Appetite:** [from discovery — time budget]

## 1. Overview
[2-3 sentences: what this feature does and why it matters. No implementation details.]

## 2. Problem Statement
[Lead with user evidence — quotes, data, support tickets. Not opinions.]
- "[User quote about the pain point]"
- [Data point: "X% of users abandon at this step"]
- Current workaround: [how users solve this today]

## 3. Goals & Success Metrics
| Goal | Metric | Target |
|------|--------|--------|
| [Outcome 1] | [Measurable metric] | [Specific number] |
| [Outcome 2] | [Measurable metric] | [Specific number] |

## 4. User Stories
**Story 1: [Title]**
As a [specific user], I want to [capability] so that [benefit].
Acceptance Criteria:
- Given [precondition], When [action], Then [expected result]
- Given [precondition], When [action], Then [expected result]

**Story 2: [Title]**
...

**Story 3: [Title]**
...

## 5. Requirements

### P0 — Must Have (blocks launch)
- **REQ-001:** When [trigger], the system shall [behavior]. _Source: [user evidence]_
- **REQ-002:** ...
[NEEDS CLARIFICATION: any P0 requirements that are ambiguous — option A | option B]

### P1 — Should Have (launch without, add within 2 weeks)
- **REQ-010:** ...

### P2 — Nice to Have (backlog)
- **REQ-020:** ...

## 6. Non-Goals
[At least 3 things this feature explicitly does NOT do]
- NOT building [thing that's tempting but out of scope]
- NOT supporting [platform/use case that's not worth the cost]
- NOT optimizing for [metric that isn't the primary goal]

## 7. Open Questions
- [Unresolved question 1 — with default recommendation]
- [Unresolved question 2 — with default recommendation]
[NEEDS CLARIFICATION: any remaining ambiguities]
```

### Step 4: Anti-Pattern Validation

Before presenting the PRD, check for these anti-patterns:

| Anti-Pattern | Check | Action |
|-------------|-------|--------|
| Opinion over evidence | Does every P0 cite a user source? | Flag unsourced P0s |
| Too long | Over 1,200 words? | Trim — move details to separate docs |
| Implementation details | Does it say HOW to build? | Remove — that's for the tech spec |
| No non-goals | Fewer than 3 non-goals? | Add more — scope control requires explicit boundaries |
| Weak success metrics | Vague metrics like "improved UX"? | Replace with numbers |
| Missing appetite | No time budget? | Add from discovery or ask user |
| Unresolved clarifications | Any `[NEEDS CLARIFICATION]` markers? | Present to user for resolution |

### Step 5: Review & Resolve

1. Present the PRD to the user.
2. Highlight any `[NEEDS CLARIFICATION]` markers — resolve each one.
3. Highlight any anti-pattern flags — fix each one.
4. Ask: "Does this capture what you want to build? Anything missing or wrong?"

### Step 6: Persist

- Save to `.codebrain/epics/{slug}/prd.md` via MCP tools
- If no epic exists yet, create one via `mcp__codebrain__codebrain_artifact_write`
- Update `.codebrain/memory/decisions.md` with any decisions made during PRD creation

### Step 7: Next Steps

After PRD is approved, suggest the workflow:
1. `/codebrain:map-journeys` — enumerate all user paths and edge cases
2. `/codebrain:epic create` — generate tech spec and tickets from the PRD
3. `/codebrain:design` — create UI mockups (if feature has a UI)

## Integration with Linear

If Linear MCP is available, offer to create a Linear project/issue from the PRD:
- Create a Linear project named after the feature
- Create Linear issues for each P0 requirement
- Tag P1/P2 as backlog items
- Link the PRD document in the project description

## Rules

- **Under 1,200 words.** If it's longer, it loses its audience. Move details to sub-documents.
- **WHAT and WHY only.** Never HOW. No database schemas, no API designs, no code.
- **Every P0 needs evidence.** No requirement without a user source.
- **Non-goals are mandatory.** At least 3. This is your scope defense.
- **`[NEEDS CLARIFICATION]` markers block tickets.** Ambiguous PRDs create ambiguous code.
- **Appetite is mandatory.** Without a time budget, you'll stay in MVP hell.
