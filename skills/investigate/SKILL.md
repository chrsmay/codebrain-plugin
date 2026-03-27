---
name: investigate
description: "Deep multi-system investigation for complex issues. Traces problems across boundaries: frontend -> API -> database -> external services. Builds evidence timeline and identifies root cause. Use for intermittent failures, race conditions, data inconsistencies, and issues that span multiple components."
version: 1.0.0
metadata:
  priority: 7
  pathPatterns:
    - "**/routes/**"
    - "**/api/**"
    - "**/middleware*"
    - "**/database/**"
    - "**/models/**"
    - "**/migrations/**"
  bashPatterns:
    - "\\bcurl\\b.*-v"
    - "\\bdocker\\s+logs\\b"
    - "\\bkubectl\\s+logs\\b"
  promptSignals:
    phrases:
      - "investigate this"
      - "root cause"
      - "trace the issue"
      - "why is this happening"
      - "intermittent failure"
      - "race condition"
      - "data inconsistency"
      - "works sometimes"
      - "flaky"
      - "non-deterministic"
      - "trace through the code"
    allOf:
      - [root, cause]
      - [trace, issue]
      - [works, sometimes]
    anyOf:
      - "investigate"
      - "root cause"
      - "trace"
      - "intermittent"
      - "flaky"
    noneOf: []
  chainTo:
    - pattern: "## Root Cause:|## Investigation Complete"
      targetSkill: plan
      message: "Root cause found - plan the fix"
---

# CodeBrain Investigate

Deep investigation for complex, multi-system issues. Goes beyond surface-level debugging to trace problems across system boundaries.

## Usage

`/codebrain:investigate [description of issue]`

## When to Use

- Issue spans multiple systems (frontend + API + database)
- Intermittent failures ("works sometimes")
- Race conditions or timing-dependent bugs
- Data inconsistencies between systems
- Issues that `/codebrain:observe` couldn't resolve
- Flaky tests with no obvious cause

## CRITICAL RULE

**Build a hypothesis tree, not a linear search.** Complex issues often have multiple contributing factors. Track all hypotheses simultaneously, eliminating them with evidence.

## Investigation Protocol

### Phase 1: Establish the Evidence Baseline

1. **Reproduce the issue** (or document the reproduction failure)
   - When does it happen? (always, intermittently, under load, after N minutes)
   - What's the minimal reproduction? (specific user, specific data, specific timing)
   - What changed recently? (`git log --oneline -20`, env changes, dep updates)

2. **Map the system boundaries**
   ```
   User → Frontend → API Gateway → Backend → Database
                                           → Cache (Redis)
                                           → External API
                                           → Message Queue
   ```
   Identify which boundaries the failing request crosses.

3. **Collect timestamps**
   - When did the issue start?
   - Is there a pattern? (time of day, after deploy, after N requests)
   - Correlate with deployments, config changes, or external events

### Phase 2: Trace the Data Flow

For each system boundary, verify data integrity:

**Frontend → API:**
```bash
# Capture the exact request
curl -v -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' 2>&1
```
- Is the request correct? (method, headers, body)
- Is the response correct? (status, headers, body)
- Timing: how long does the request take?

**API → Database:**
- Enable query logging (temporarily)
- Check: Are queries correct? Are they returning expected data?
- Check: Connection pool status (max connections, idle connections)
- Check: Transaction isolation (are concurrent writes conflicting?)

**API → External Services:**
- Check: Are API keys valid? Are rate limits hit?
- Check: Response format changed? (breaking API update)
- Check: Timeout configuration (is it too short?)

**API → Cache:**
- Check: Cache hit/miss ratio
- Check: Cache invalidation timing (stale data?)
- Check: Serialization (data going in matches data coming out?)

### Phase 3: Build the Hypothesis Tree

```markdown
## Hypothesis Tree

Root Issue: [description]
├── H1: [First hypothesis]
│   ├── Evidence FOR: [what supports this]
│   ├── Evidence AGAINST: [what contradicts this]
│   └── Status: CONFIRMED | ELIMINATED | NEEDS DATA
├── H2: [Second hypothesis]
│   ├── Evidence FOR: ...
│   ├── Evidence AGAINST: ...
│   └── Status: ...
└── H3: [Third hypothesis]
    ├── Evidence FOR: ...
    ├── Evidence AGAINST: ...
    └── Status: ...
```

**Rules for hypothesis management:**
- Start with at least 3 hypotheses
- Never pursue a single hypothesis in isolation
- Eliminate hypotheses with evidence, not intuition
- If all hypotheses are eliminated, generate new ones from the evidence

### Phase 4: Targeted Investigation

Based on the hypothesis tree, run targeted checks:

**For timing/race conditions:**
- Add logging with timestamps at each system boundary
- Check for missing `await` or fire-and-forget patterns
- Look for shared mutable state accessed from concurrent requests
- Check database transaction isolation levels

**For data inconsistencies:**
- Compare data at each system boundary (request vs. DB vs. response)
- Check serialization/deserialization (JSON parsing, date formats, null handling)
- Check schema migrations (is the DB schema in sync with the code?)

**For intermittent failures:**
- Check resource limits (memory, file descriptors, connection pools)
- Check for retry logic that masks transient errors
- Check for environment differences (dev vs. staging vs. prod)
- Look for time-dependent logic (timezone, expiry, cron timing)

### Phase 5: Document the Root Cause

## Investigation Report Template

```markdown
# Investigation Report

**Issue:** [one-line description]
**Severity:** Critical | Major | Minor
**Date:** [ISO date]
**Time to Root Cause:** [duration]

## Symptom
[Exact description of what the user sees]

## System Boundary Map
[ASCII diagram showing the data flow and where the issue occurs]

## Evidence Timeline
| Time | Event | Source | Notes |
|------|-------|--------|-------|
| T-0 | Issue first reported | User | ... |
| T-1 | Last known working state | Git/Deploy log | ... |
| T-2 | Change X deployed | CI/CD | ... |

## Hypothesis Tree (Final)
[Show which hypotheses were confirmed/eliminated with evidence]

## Root Cause
**What:** [Exact description of the bug/misconfiguration/race condition]
**Where:** [file:line or system boundary]
**Why:** [Why this wasn't caught earlier]
**When introduced:** [commit, deploy, or config change]

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Observe: ...]

## Recommended Fix
- [ ] [Primary fix with file:line reference]
- [ ] [Regression test to prevent recurrence]
- [ ] [Monitoring/alerting to detect if it happens again]

## Prevention
- [ ] [What process/check would have caught this?]
```

## When to Escalate

- **To `/codebrain:plan`** — root cause found, fix needs a structured implementation plan
- **To `/codebrain:deploy`** — root cause is configuration or environment related
- **To `/codebrain:debug`** — root cause is isolated to a single component
