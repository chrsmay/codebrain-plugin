---
name: observe
description: "Orchestrated debugging coordinator. Triggers on frustration signals (stuck, hung, broken) and systematically triages: runtime logs -> server health -> test output -> build status. Reports findings at every step. Use when something is not responding, hanging, timing out, or producing no output."
version: 1.0.0
metadata:
  priority: 8
  pathPatterns:
    - "**/*.log"
    - "**/error.ts"
    - "**/error.tsx"
    - "**/error.js"
    - "**/middleware.ts"
    - "**/middleware.js"
    - "**/instrumentation.ts"
    - "**/instrumentation.js"
    - "**/app.py"
    - "**/main.py"
  bashPatterns:
    - "\\btail\\s+-f\\b"
    - "\\bcurl\\s+.*localhost"
    - "\\bcurl\\s+.*127\\.0\\.0\\.1"
    - "\\bdocker\\s+logs\\b"
    - "\\bvercel\\s+logs\\b"
    - "\\bnetstat\\b"
  promptSignals:
    phrases:
      - "nothing happened"
      - "still waiting"
      - "it's stuck"
      - "it's hung"
      - "not responding"
      - "seems frozen"
      - "timed out"
      - "keeps timing out"
      - "check the logs"
      - "where are the logs"
      - "how do I debug"
      - "spinning forever"
      - "no response"
      - "not loading"
      - "something is broken"
      - "something broke"
      - "what went wrong"
      - "why did it fail"
    allOf:
      - [stuck, waiting]
      - [not, responding]
      - [check, logs]
      - [no, response]
    anyOf:
      - "stuck"
      - "hung"
      - "frozen"
      - "timeout"
      - "investigate"
      - "broken"
    noneOf:
      - "unit test"
      - "jest"
      - "vitest"
  chainTo:
    - pattern: "localhost:\\d+"
      targetSkill: debug
      message: "Server URL detected in logs - debug the endpoint"
---

# CodeBrain Observe

Orchestrated debugging coordinator. Systematically triages stuck, hung, or broken systems by checking signals in a structured order. Never guesses — always collects evidence first.

## Usage

`/codebrain:observe [symptom]`

- If symptom provided: start triage from the most likely signal source
- If no symptom: run the full triage checklist

## CRITICAL RULE

**Never skip steps.** Follow the triage order. Report what you find at EVERY step using the reporting contract: "Checking X → Found Y → Next step Z" or "Checking X → No signal → Moving to Z".

## Triage Order

Execute in this order. Stop when you find a high-confidence root cause.

### Step 1: Runtime Logs

Check for error output in the most likely location:

**Dev server terminal:**
- Look at the terminal output where `npm run dev` / `next dev` / `python manage.py` is running
- Search for: stack traces, unhandled promise rejections, import errors, port conflicts

**Application logs:**
- `tail -f` any `.log` files in the project
- Check `docker logs <container>` if containerized
- Check `vercel logs` if deployed

**Browser console:**
- If applicable, check for JavaScript errors, failed network requests, CORS issues

**What to report:**
- Exact error messages (copy, don't paraphrase)
- Timestamps (when did it start failing?)
- Frequency (every request, or intermittent?)

### Step 2: Server Health

Check if the server is actually running and accessible:

```bash
# Check if port is in use
netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp | grep :3000

# Check if server responds
curl -sI http://localhost:3000 --max-time 5

# Check process
ps aux | grep -E "node|python|go" | grep -v grep
```

**Common findings:**
- Port not in use → server crashed or never started
- Port in use but no response → server hung (infinite loop, deadlock, unresolved promise)
- 500 response → server running but erroring (check step 1 logs)
- Connection refused → firewall, wrong port, or server not bound to 0.0.0.0

### Step 3: Test Output

Run the project's test suite to check for regressions:

```bash
npm test 2>&1 | tail -20
# or
pytest -x --tb=short 2>&1 | tail -20
```

**What to look for:**
- Which tests fail? (the failure pattern reveals the broken subsystem)
- Did tests pass before? (`git stash && npm test` to test clean state)
- Timeout failures (tests that hang = same root cause as the main issue)

### Step 4: Build Status

Check if the project builds cleanly:

```bash
npm run build 2>&1 | tail -30
# or
tsc --noEmit 2>&1 | tail -20
```

**What to look for:**
- Type errors (often cause runtime failures)
- Missing dependencies (recently added but not installed?)
- Config errors (malformed next.config, tsconfig, etc.)

### Step 5: Environment

Check environment variables and configuration:

```bash
# Check if .env exists and has content
ls -la .env* 2>/dev/null
wc -l .env.local 2>/dev/null

# Check for missing required vars
grep -r "process.env\." --include="*.ts" --include="*.js" -h | grep -oP 'process\.env\.(\w+)' | sort -u
```

**Common findings:**
- `.env.local` missing → run `vercel env pull` or copy `.env.example`
- API keys expired or wrong
- DATABASE_URL pointing to wrong host/port

## Common Hang Causes Reference

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| Server starts then hangs | Missing `await` on async call | Search for `async` functions missing `await` |
| Server starts, first request hangs | Database connection pool exhausted | Check DB connection config, max connections |
| Intermittent hangs | Race condition or deadlock | Check for concurrent writes to shared state |
| Build hangs | Circular dependency | Check import chains |
| Tests hang | Unresolved promise in setup/teardown | Check `beforeAll`/`afterAll` hooks |
| Everything worked yesterday | Env var changed, dep updated, or config drift | `git diff HEAD~1` + check .env changes |

## Stop Condition

Stop the triage when:
1. **High-confidence root cause found** — you can explain exactly what's broken and why
2. **Two consecutive steps with no signal** — escalate to `/codebrain:investigate` for deeper analysis

## Reporting Format

```markdown
## Observation Report

**Symptom:** [user's description]
**Root Cause:** [FOUND | SUSPECTED | UNKNOWN]

### Triage Steps
| Step | Signal Source | Finding | Confidence |
|------|-------------|---------|------------|
| 1 | Runtime Logs | [finding or "No signal"] | High/Low |
| 2 | Server Health | [finding or "No signal"] | High/Low |
| 3 | Test Output | [finding or "No signal"] | High/Low |
| 4 | Build Status | [finding or "No signal"] | High/Low |
| 5 | Environment | [finding or "No signal"] | High/Low |

### Root Cause
[Detailed explanation with evidence]

### Recommended Action
- [ ] [Action item with specific commands/file:line references]
```

## When to Escalate

- **To `/codebrain:debug`** — when root cause is found and needs systematic fix
- **To `/codebrain:investigate`** — when issue spans multiple systems (frontend + API + DB)
- **To `/codebrain:deploy`** — when issue is environment/deployment related
