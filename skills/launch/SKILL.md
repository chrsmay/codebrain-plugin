---
name: launch
description: "Use when a feature is implemented and verified but not yet shipped. Generates a stack-aware pre-launch checklist covering performance, security, accessibility, error handling, monitoring, and rollback. Validates Definition of Done. Creates a rollout plan with feature flags. Prevents shipping broken features."
metadata:
  priority: 6
  pathPatterns:
    - "**/Dockerfile"
    - "**/docker-compose.yml"
    - "**/docker-compose.yaml"
    - "**/.github/workflows/**"
    - "**/vercel.json"
    - "**/netlify.toml"
    - "**/CHANGELOG.md"
    - "**/RELEASE.md"
  bashPatterns:
    - "\\bnpm\\s+run\\s+build\\b"
    - "\\bvercel\\s+deploy\\b"
    - "\\bdocker\\s+build\\b"
    - "\\bgit\\s+tag\\b"
    - "\\bnpm\\s+publish\\b"
  promptSignals:
    phrases:
      - "ready to launch"
      - "deploy this"
      - "go to production"
      - "release checklist"
      - "pre-launch"
      - "ship to prod"
      - "rollout plan"
      - "deployment plan"
      - "ship it"
    allOf:
      - [ready, deploy]
      - [launch, production]
      - [ship, prod]
    anyOf:
      - "launch"
      - "deploy"
      - "release"
      - "production"
    noneOf:
      - "staging"
      - "dev server"
  chainTo:
    - pattern: "## Launch Complete|## Deployed|## Rollout Complete"
      targetSkill: retro
      message: "Launch complete - run retrospective"
---

# CodeBrain Launch

Pre-launch validation and rollout planning. The phase between "code works" and "users have it."

## Usage

`/codebrain:launch [epic-slug]`
`/codebrain:launch checklist` — just run the checklist without rollout planning

## Workflow

### Step 1: Load Context

1. Read the PRD (`.codebrain/epics/{slug}/prd.md`) for success metrics and requirements.
2. Read the journey map (`.codebrain/epics/{slug}/journeys.md`) for edge cases.
3. Read verification reports (`.codebrain/active/verification.md`).
4. Read `.codebrain/memory/constitution.md`.
5. Call `mcp__codebrain__codebrain_config_read` for project stack info.

### Step 2: Run Pre-Launch Checklist

Validate each category. Check items via Bash, MCP tools, or code inspection:

#### Performance
- [ ] Page/API response time < target (from PRD success metrics)
- [ ] No N+1 queries (check database access patterns)
- [ ] Images optimized (if applicable)
- [ ] Bundle size acceptable (run build and check output)
- [ ] Lighthouse performance score > 80 (if web app — use Lighthouse MCP)

#### Security
- [ ] No secrets in client-side code (Grep for API keys, tokens, passwords)
- [ ] Authentication required on all protected routes
- [ ] Input validation on all user inputs (from journey map edge cases)
- [ ] CSRF protection enabled (if applicable)
- [ ] Rate limiting on public endpoints
- [ ] No SQL injection / XSS vulnerabilities (ESLint + Semgrep)
- [ ] Dependencies scanned (Socket + Sonatype MCP)

#### Error Handling
- [ ] All sad paths from journey map have error handling
- [ ] Consistent error response format across all endpoints
- [ ] No stack traces exposed to users
- [ ] Custom 404/500 pages (if web app)
- [ ] Retry logic for transient failures
- [ ] Graceful degradation when dependencies fail

#### Accessibility (if web app)
- [ ] All images have alt text
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA (Lighthouse MCP)
- [ ] Screen reader tested
- [ ] Focus management on modals/dialogs

#### Testing
- [ ] All P0 acceptance criteria have tests
- [ ] Test coverage > threshold (test-coverage MCP)
- [ ] Edge cases from journey map have tests
- [ ] Integration tests for critical flows
- [ ] No skipped or pending tests

#### Documentation
- [ ] API endpoints documented (if applicable)
- [ ] User-facing docs updated (if applicable)
- [ ] Changelog entry written
- [ ] README updated (if applicable)

#### Monitoring
- [ ] Error tracking configured (Sentry MCP check)
- [ ] Key metrics have alerts/dashboards
- [ ] Health check endpoint exists and works
- [ ] Log levels appropriate (no debug logs in production)

### Step 3: Definition of Done Validation

Compare against the Definition of Done from the epic/plan:
- [ ] All P0 requirements implemented
- [ ] All tests passing
- [ ] Code reviewed (or self-reviewed via `/codebrain:review`)
- [ ] No `[NEEDS CLARIFICATION]` markers remaining
- [ ] No `[SPEC_DEVIATION]` markers unresolved
- [ ] No Critical or Major issues from verification
- [ ] Journey map edge cases handled or explicitly accepted

### Step 4: Generate Rollout Plan

```markdown
# Rollout Plan: [Feature Name]

## Pre-Conditions
- [ ] Feature flag created: `FEATURE_[name]`
- [ ] Staging environment tested
- [ ] Rollback procedure documented below

## Rollout Phases
| Phase | Audience | Duration | Success Criteria |
|-------|----------|----------|-----------------|
| 1. Dark Launch | Internal team only | 1-2 days | No errors, flows work |
| 2. Canary | 5% of users | 1-3 days | Error rate < 0.1%, latency stable |
| 3. Partial | 25% of users | 2-3 days | Metrics trending toward goals |
| 4. Majority | 50% of users | 2-3 days | No degradation at scale |
| 5. Full | 100% of users | Permanent | Success metrics met |

## Rollback Procedure
1. Set feature flag to OFF (immediate, <1 minute)
2. If data was written: [describe data migration/cleanup needed]
3. Notify: [who needs to know]
4. Root cause: [investigate before re-enabling]

## Monitoring During Rollout
- Watch: [specific metrics from PRD success criteria]
- Alert if: [threshold that triggers investigation]
- Rollback if: [threshold that triggers immediate rollback]

## Post-Launch Validation (24 hours after 100%)
- [ ] Success metrics trending toward PRD goals
- [ ] Error rate stable
- [ ] No support tickets related to the feature
- [ ] Performance baseline maintained
```

### Step 5: Present Report

```markdown
# Launch Readiness Report: [Feature Name]

**Date:** [today]
**Verdict:** READY TO SHIP | NOT READY — [N] blockers

## Checklist Results
| Category | Pass | Fail | Skipped |
|----------|------|------|---------|
| Performance | N | N | N |
| Security | N | N | N |
| Error Handling | N | N | N |
| Accessibility | N | N | N |
| Testing | N | N | N |
| Documentation | N | N | N |
| Monitoring | N | N | N |
| Definition of Done | N | N | N |

## Blockers (must fix before launch)
- [blocker 1]

## Warnings (ship but fix soon)
- [warning 1]

## Rollout Plan
[attached above]
```

### Step 6: Persist & Integrate

- Save to `.codebrain/epics/{slug}/launch-report.md` via MCP tools
- If Linear MCP is available:
  - Create Linear issues for any blockers
  - Mark the epic's milestone as "Launch Ready" or "Blocked"
  - Add the rollout plan to the project description

## Rules

- **Blockers are non-negotiable.** Security issues, missing error handling on P0 flows, and failing tests block launch.
- **Warnings ship.** Performance optimizations, minor accessibility issues, and documentation gaps are tracked but don't block.
- **Rollback plan is mandatory.** Every launch must have a "turn it off" procedure.
- **Feature flags for everything non-trivial.** Never ship directly to 100%.
