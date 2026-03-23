---
name: discover
description: "Use BEFORE writing a PRD. Structured problem discovery that validates whether a feature is worth building. Asks who has the problem, how painful it is, what alternatives exist, and what success looks like. Outputs an opportunity statement. Prevents building things nobody wants."
metadata:
  priority: 6
  pathPatterns:
    - "**/README.md"
    - "**/package.json"
    - "**/pyproject.toml"
    - "**/Cargo.toml"
  promptSignals:
    phrases:
      - "is this feasible"
      - "can we build"
      - "feasibility"
      - "what would it take"
      - "explore this idea"
      - "is this possible"
      - "scope this out"
      - "worth building"
    allOf:
      - [feasible, build]
      - [possible, implement]
    anyOf:
      - "feasibility"
      - "explore"
      - "scope"
      - "assess"
    noneOf: []
  chainTo:
    - pattern: "## Feasibility: GO|## Recommendation: Proceed|## Opportunity Statement"
      targetSkill: prd
      message: "Feasibility confirmed - write PRD"
---

# CodeBrain Discover

Problem framing before any planning begins. Validates the problem is real, painful, and worth solving.

## Usage

`/codebrain:discover [feature idea]`

## Why This Exists

Most MVPs fail not because of bad code but because they solve the wrong problem. Discovery forces you to answer "is this worth building?" BEFORE investing time in PRDs, specs, and code.

## Workflow

### Step 1: Problem Interview

Ask these questions ONE AT A TIME. Wait for each answer before proceeding:

1. **Who has this problem?** Describe the specific user. Not "everyone" — who specifically feels the pain?
2. **What is the problem in their words?** If you've talked to users, quote them. If not, describe the pain point as concretely as possible.
3. **How are they solving it today?** Every problem has a workaround — what is it? (Manual process, spreadsheet, competitor product, ignoring it?)
4. **How painful is it?** Scale of 1-10. A 3 means "annoying but livable." A 9 means "actively losing money/time/users."
5. **How frequently does it occur?** Daily? Weekly? Once a quarter? Frequency × pain = urgency.
6. **What have you already tried or considered?** Have you built a prototype? Researched solutions? What didn't work?

### Step 2: Competitive Landscape

7. **Who else solves this?** List competitors, open-source tools, or built-in features that address this problem.
8. **Why isn't the existing solution good enough?** What's the gap? (Too expensive, too complex, missing a key feature, wrong platform?)

### Step 3: Success Definition

9. **What does success look like?** Not "it works" — what measurable outcome? (Users complete the flow in <30 seconds, support tickets decrease by 50%, revenue increases by $X)
10. **What is the smallest version that delivers value?** If you could only build ONE thing, what would it be?

### Step 4: Generate Opportunity Statement

Based on the answers, generate a structured opportunity statement:

```markdown
# Opportunity Statement: [Feature Name]

## Problem
[Who] experiences [problem] when [context]. Currently they [workaround], which is [pain level] because [reason]. This occurs [frequency].

## Evidence
- [User quote or data point 1]
- [User quote or data point 2]
- [Competitive gap identified]

## Proposed Solution (High-Level)
[1-2 sentences — WHAT, not HOW]

## Success Metrics
- [Metric 1: measurable outcome]
- [Metric 2: measurable outcome]

## Smallest Viable Version
[The ONE thing that delivers value]

## Non-Goals (Explicitly Not Building)
- [Feature that's tempting but not essential]
- [Nice-to-have that would delay shipping]

## Risk Assessment
- **Biggest risk:** [what could make this fail]
- **Mitigation:** [how to reduce that risk]

## Appetite
[How much time are you willing to invest? 1 day? 1 week? 6 weeks?]
```

### Step 5: Persist

- Save to `.codebrain/epics/{slug}/discovery.md` via MCP tools
- If this is a standalone discovery (no epic yet), save to `.codebrain/active/discovery.md`

### Step 6: Go/No-Go

Present the opportunity statement and ask:
- "Based on this analysis, should we proceed to writing a PRD?"
- If yes → suggest `/codebrain:prd` as the next step
- If no → document why in `.codebrain/memory/decisions.md` (knowing what NOT to build is valuable)

## Rules

- **One question at a time.** Do not batch questions.
- **Push back on vague answers.** "Everyone needs this" → "Who specifically? Name one person."
- **Non-goals are mandatory.** Every discovery must list what you're NOT building.
- **Appetite is mandatory.** Without a time budget, scope will creep endlessly.
- **No implementation details.** Discovery is about WHAT and WHY, never HOW.
