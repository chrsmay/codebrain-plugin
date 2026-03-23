---
name: retro
description: "Use after shipping a feature to run a structured retrospective. Gathers metrics (what shipped, what was cut, time spent), identifies what went well and what didn't, updates the PRD with learnings, and plans the next iteration. Prevents 'ship once and forget' — the root cause of MVP hell."
metadata:
  priority: 4
  pathPatterns:
    - ".codebrain/epics/**"
    - "**/RETRO.md"
    - "**/RETROSPECTIVE.md"
  bashPatterns:
    - "\\bgit\\s+log\\s+--oneline\\b"
  promptSignals:
    phrases:
      - "retrospective"
      - "what went well"
      - "what could improve"
      - "lessons learned"
      - "post mortem"
      - "sprint review"
    allOf:
      - [what, went, well]
      - [lessons, learned]
    anyOf:
      - "retro"
      - "retrospective"
      - "lessons"
      - "post mortem"
    noneOf: []
  chainTo:
    - pattern: "## Action Items|## Next Iteration"
      targetSkill: discover
      message: "Retro complete - discover next iteration scope"
---

# CodeBrain Retro

Post-launch retrospective and iteration planning. Closes the loop from shipped feature back to product learning.

## Usage

`/codebrain:retro [epic-slug]`

## Why This Exists

MVP hell happens when you ship once and never iterate. Retros force you to: measure what you shipped against what you planned, learn from what went wrong, and plan the NEXT version. Without this, your app accumulates features that are "good enough" but never great.

## Workflow

### Step 1: Gather Data

1. **Read the epic artifacts:**
   - PRD (`.codebrain/epics/{slug}/prd.md`) — what was planned
   - Journey map (`.codebrain/epics/{slug}/journeys.md`) — what paths were identified
   - Tickets — what was built vs. deferred
   - Execution logs — how each ticket went
   - Launch report — what passed and what was flagged
   - Verification reports — what issues were found

2. **Check git history:**
   - `git log --oneline --since="[epic start date]"` — what was committed
   - How many commits? How many days did it take?
   - Were there any reverts or hotfixes?

3. **Check Linear** (if available):
   - How many issues were completed vs. backlogged?
   - Any bugs filed since launch?
   - Time from first commit to launch

### Step 2: Metrics Analysis

```markdown
## Metrics

### Scope
| Category | Planned | Shipped | Cut | Deferred |
|----------|---------|---------|-----|----------|
| P0 Requirements | N | N | 0 | N |
| P1 Requirements | N | N | N | N |
| P2 Requirements | N | N | N | N |
| Edge Cases Handled | N | N | N | N |

### Time
- **Appetite (planned):** [from discovery — e.g., "2 weeks"]
- **Actual time:** [first commit to launch]
- **Over/Under:** [+N days or -N days]
- **Biggest time sink:** [what took longer than expected]

### Quality
- **Verification cycles:** [how many fix-and-verify loops]
- **Critical issues found:** [count]
- **Spec deviations:** [count]
- **Post-launch bugs:** [count, from Linear or support]
```

### Step 3: Structured Retrospective

Ask the user these questions ONE AT A TIME:

1. **What went well?** What would you do exactly the same way next time?
2. **What didn't go well?** What caused friction, delays, or frustration?
3. **What surprised you?** Anything unexpected — good or bad?
4. **What would you do differently?** Specific changes for next time.
5. **What did the user/customer actually experience?** Does reality match the PRD's success metrics?

### Step 4: Generate Retro Document

```markdown
# Retrospective: [Feature Name]

**Epic:** [slug]
**Date:** [today]
**Duration:** [start to launch]

## Summary
[2-3 sentences: what was built, how it went, key takeaway]

## Metrics
[from Step 2]

## What Went Well
- [item 1]
- [item 2]

## What Didn't Go Well
- [item 1 — with root cause if identifiable]
- [item 2 — with root cause if identifiable]

## Surprises
- [unexpected discovery]

## Process Improvements
[Changes to apply to FUTURE features, not just this one]
- [ ] [Improvement 1 — e.g., "Write journey map earlier, before tech spec"]
- [ ] [Improvement 2 — e.g., "Set up monitoring before launch, not after"]

## PRD Update Recommendations
[What should change in the PRD based on reality]
- **REQ-001:** [still valid / needs modification / should be removed]
- **REQ-010:** [promoted to P0 based on user feedback]
- **New requirement:** [discovered during implementation]

## Next Iteration Plan
### Now (this week)
- [ ] [Bug fix or urgent improvement]

### Next (next 2 weeks)
- [ ] [P1 requirement that was deferred]
- [ ] [Edge case that was accepted but should be handled]

### Later (backlog)
- [ ] [P2 requirement]
- [ ] [Nice-to-have discovered during implementation]

## Constitution Updates
[Any new principles learned — add to constitution if applicable]
- [e.g., "Always set up error tracking before launch" → add to constitution]
```

### Step 5: Update Memory

- Update `.codebrain/memory/continuity.md` — what was shipped and what's next
- Update `.codebrain/memory/patterns.md` — any new patterns or anti-patterns discovered
- Update `.codebrain/memory/decisions.md` — decisions validated or invalidated by reality
- Update `.codebrain/memory/known-issues.md` — bugs or debt from this feature
- If process improvements apply to the constitution, update `.codebrain/memory/constitution.md`

### Step 6: Persist & Integrate

- Save to `.codebrain/epics/{slug}/retro.md` via MCP tools
- If Linear MCP is available:
  - Create Linear issues for "Next Iteration Plan" items
  - Tag them with the epic label
  - Close the epic's milestone

### Step 7: Next Cycle

After retro is complete:
- If "Now" items exist → `/codebrain:plan` or `/codebrain:debug` to address them
- If next iteration is planned → `/codebrain:prd` to update the PRD, then `/codebrain:epic create` for the next cycle
- If feature is complete → celebrate, move to next feature

## Rules

- **Retro within 1 week of launch.** Beyond that, memory fades and lessons are lost.
- **Measure against the PRD, not feelings.** Did the success metrics improve? Did P0s ship?
- **Process improvements are for FUTURE features.** Don't retroactively change the current one.
- **Update the constitution.** If you learned a universal lesson, encode it so you never repeat the mistake.
- **Plan the next iteration.** A retro without a "next" section is incomplete — it just becomes a complaint list.
