---
name: autopilot
description: "Use for fire-and-forget execution via Remote Control. Wraps YOLO mode with Remote Control session bridging, pre-flight checks, phone-readable pause summaries, and completion reports. Start a task at your desk, monitor and approve from your phone. Inspired by Stripe's Minions fire-and-forget pattern."
version: 1.0.0
metadata:
  priority: 7
  pathPatterns:
    - "**/.codebrain/autopilot*"
    - "**/.codebrain/remote*"
  bashPatterns:
    - "remote|autopilot|fire.and.forget"
  promptSignals:
    phrases:
      - "run this while I'm away"
      - "fire and forget"
      - "autopilot"
      - "run this on my phone"
      - "walk away and come back"
      - "remote control"
      - "run overnight"
    allOf:
      - [run, away]
      - [fire, forget]
    anyOf:
      - "autopilot"
      - "fire and forget"
      - "remote"
    noneOf: []
---

# CodeBrain Autopilot

Fire-and-forget execution mode. Start a task at your desk, walk away, approve decisions from your phone via Remote Control.

Inspired by Stripe's Minions: "An engineer sends a message, walks away, and comes back to a finished pull request."

## Usage

`/codebrain:autopilot <task description>`
`/codebrain:autopilot epic <slug>` — autopilot through an entire epic
`/codebrain:autopilot resume` — resume a paused autopilot session

## How It Works

Autopilot = Remote Control + YOLO + structured handoff. It wraps the existing YOLO mode with a Remote Control session so you can monitor and make decisions from your phone.

## Workflow

### Step 1: Pre-Flight Checklist

Before starting, verify everything is ready:

- [ ] **Constitution exists:** Check `.codebrain/memory/constitution.md` — if missing, run `/codebrain:memory reset` first
- [ ] **Build/test commands configured:** Check `.codebrain/config.json` — if missing, auto-detect from package.json
- [ ] **Linear connected** (if required): Check `linearSync` in config — if required but not connected, stop and tell user
- [ ] **No uncommitted changes:** Run `git status` — if dirty working tree, ask user to commit or stash first
- [ ] **Remote Control active:** Check if the session is already bridged to Remote Control

If any check fails, stop and report what needs to be fixed. Do NOT proceed with a broken setup.

### Step 2: Start Remote Control

If Remote Control is not already active:

1. Tell the user: "Starting Remote Control. A QR code will appear — scan it with the Claude app on your phone to connect."
2. Explain what will happen: "I'll run YOLO mode on your task. I'll pause and ask you on your phone whenever I need a decision (ambiguities, spec deviations, critical issues). Otherwise, I'll plan, implement, verify, and commit autonomously."
3. The user starts remote control via `/remote-control` or `claude --remote-control` (this must be done by the user — Claude cannot start it programmatically)

### Step 3: Session Naming

Name the session descriptively so it's recognizable on the phone:
- Single task: "CodeBrain: [first 50 chars of task description]"
- Epic: "CodeBrain: [epic name] — [N] tickets"

### Step 4: Kick Off YOLO

Run `/codebrain:yolo` with the specified task or epic. All YOLO safety rails apply:
- Max 2 fix attempts per issue
- Critical issues always pause
- `[NEEDS CLARIFICATION]` markers always pause
- `[SPEC_DEVIATION]` markers always pause
- Circuit breaker on 2x token budget
- Git commit after each successful cycle

### Step 5: Phone-Readable Pause Summaries

When YOLO pauses, format the message for phone reading (short, clear, actionable):

```markdown
## ⏸ Autopilot Paused

**Reason:** [NEEDS CLARIFICATION | SPEC DEVIATION | CRITICAL ISSUE | CIRCUIT BREAKER]

**What happened:**
[2-3 sentences max — what was being worked on and why it stopped]

**Decision needed:**
[Clear, specific question with numbered options]

1. [Option A — brief description]
2. [Option B — brief description]
3. Skip this and move to next ticket

**Reply with the number of your choice.**
```

Key formatting rules for phone readability:
- **Short sentences.** Phone screens are narrow.
- **Numbered options.** Easy to reply "1" from phone keyboard.
- **No code blocks.** They render poorly on mobile.
- **Bold the decision needed.** It should be visible at a glance.

### Step 6: Resume After Decision

When the user replies (from phone or desktop):
1. Parse their response (number or free text)
2. Apply the decision
3. Continue YOLO execution
4. If more pauses occur, repeat Step 5

### Step 7: Completion Summary

When YOLO completes (all tasks done or all retries exhausted):

```markdown
## ✅ Autopilot Complete

**Task:** [description]
**Duration:** [time from start to finish]
**Result:** [COMPLETE | PARTIAL — N of M tasks done]

### What Was Done
- [commit 1 summary]
- [commit 2 summary]
- ...

### Verification
- Build: PASS/FAIL
- Tests: PASS/FAIL
- Lint: PASS/FAIL

### What Needs Your Attention
[List of any issues that were escalated, handoff summaries from exhausted retries]

### Linear Status
[If connected: link to project, issue count by status]

### Next Steps
- Review the commits: `git log --oneline -N`
- Run `/codebrain:review` for a thorough code review
- Run `/codebrain:launch` when ready to ship
```

### Step 8: Update Memory

- Update `.codebrain/memory/continuity.md` with autopilot session summary
- Update Linear if connected (project update with health status)

## Safety Rails

All YOLO safety rails apply, plus:
- **Pre-flight checklist is mandatory.** No autopilot without clean state.
- **Uncommitted changes block start.** Prevents losing work.
- **Every pause is phone-formatted.** User never sees a wall of text on mobile.
- **Completion summary is always generated.** Even if the user wasn't monitoring.

## Rules

- **Don't start without pre-flight passing.** Fix issues first.
- **Format everything for mobile.** Short, clear, numbered options.
- **Complete > Perfect.** Partial results with a handoff summary are valuable. Don't loop forever.
- **Memory update is mandatory.** Even if the session was interrupted.
