---
name: deploy
description: "Deployment orchestration and environment management. Handles deploy commands, env vars, CI/CD pipelines, promote/rollback procedures. Platform-agnostic: supports Vercel, Docker, Fly.io, Railway, and custom CI/CD. Use when deploying, setting up pipelines, or managing environments."
version: 1.0.0
metadata:
  priority: 6
  pathPatterns:
    - "**/.github/workflows/**"
    - "**/Dockerfile"
    - "**/docker-compose.yml"
    - "**/docker-compose.yaml"
    - "**/vercel.json"
    - "**/netlify.toml"
    - "**/fly.toml"
    - "**/railway.json"
    - "**/Procfile"
    - "**/.env*"
  bashPatterns:
    - "\\bvercel\\s+deploy\\b"
    - "\\bvercel\\s+env\\b"
    - "\\bdocker\\s+push\\b"
    - "\\bdocker\\s+build\\b"
    - "\\bfly\\s+deploy\\b"
    - "\\brailway\\s+up\\b"
    - "\\bgit\\s+push\\b.*main"
    - "\\bgit\\s+push\\b.*production"
  promptSignals:
    phrases:
      - "deploy to production"
      - "deploy to staging"
      - "set up CI/CD"
      - "configure deployment"
      - "environment variables"
      - "set up the pipeline"
      - "push to production"
      - "rollback deployment"
      - "promote to prod"
    allOf:
      - [deploy, production]
      - [set, up, pipeline]
      - [configure, deployment]
    anyOf:
      - "deploy"
      - "deployment"
      - "CI/CD"
      - "pipeline"
    noneOf:
      - "dev server"
      - "localhost"
  chainTo:
    - pattern: "## Deployed Successfully|## Deployment Complete"
      targetSkill: verify
      message: "Deployment complete - verify in production"
    - pattern: "## Deployment Failed|ROLLBACK"
      targetSkill: observe
      message: "Deployment failed - investigate"
---

# CodeBrain Deploy

Deployment orchestration and environment management. Platform-agnostic.

## Usage

`/codebrain:deploy [target]`

- If target provided: deploy to that environment (staging, production)
- If no target: auto-detect from project config and ask

## Pre-Deploy Checklist

Before any deployment, verify:

1. **Build passes locally**
   ```bash
   npm run build 2>&1 | tail -5
   # Should exit 0 with no errors
   ```

2. **Tests pass**
   ```bash
   npm test 2>&1 | tail -10
   ```

3. **Environment variables are set**
   - Check `.env.example` or `.env.sample` for required vars
   - Verify all required vars are set in the target environment
   - Never commit `.env.local` or files containing secrets

4. **No uncommitted changes**
   ```bash
   git status --porcelain
   # Should be empty
   ```

5. **Branch is up to date**
   ```bash
   git pull --rebase origin main
   ```

## Platform Detection

Auto-detect deployment platform from project files:

| File | Platform |
|------|----------|
| `vercel.json` or `.vercel/` | Vercel |
| `Dockerfile` | Docker (+ any orchestrator) |
| `fly.toml` | Fly.io |
| `railway.json` | Railway |
| `netlify.toml` | Netlify |
| `.github/workflows/deploy*` | GitHub Actions (custom) |
| `Procfile` | Heroku-compatible |

## Deployment by Platform

### Vercel

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Promote a preview to production (no rebuild)
vercel promote <deployment-url>

# Rollback to previous production
vercel rollback

# Pull environment variables
vercel env pull .env.local

# View deployment logs
vercel logs <deployment-url>

# Inspect deployment details
vercel inspect <deployment-url>
```

### Docker

```bash
# Build image
docker build -t myapp:latest .

# Test locally
docker run -p 3000:3000 --env-file .env.local myapp:latest

# Push to registry
docker push registry.example.com/myapp:latest
```

### Fly.io

```bash
# Deploy
fly deploy

# View logs
fly logs

# Scale
fly scale count 2

# Rollback
fly releases list
fly deploy --image registry.fly.io/myapp:v<N>
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      # Platform-specific deploy step here
```

## Environment Variable Management

### Hierarchy (most specific wins)
1. `.env` — base defaults (committed, no secrets)
2. `.env.local` — local overrides (gitignored, has secrets)
3. `.env.production` — production-specific (committed, no secrets)
4. `.env.production.local` — production secrets (gitignored)

### Required vs Optional

Check for required variables before deploy:
```bash
# Extract required vars from code
grep -rh "process.env\.\w\+" --include="*.ts" --include="*.js" | \
  grep -oP 'process\.env\.(\w+)' | sort -u
```

Compare against what's set in the target environment.

## Rollback Procedure

1. **Identify the last working deployment**
   ```bash
   vercel ls --limit 5  # or equivalent
   ```

2. **Rollback immediately** (don't debug in production)
   ```bash
   vercel rollback  # or equivalent
   ```

3. **Verify rollback succeeded**
   - Check health endpoints
   - Run smoke tests against production
   - Check error monitoring (Sentry, etc.)

4. **Investigate the failure** separately
   - Use `/codebrain:observe` or `/codebrain:investigate`
   - Fix in a branch, test, then re-deploy

## Post-Deploy Verification

After every deployment:

1. **Health check** — hit the health endpoint
2. **Smoke test** — test critical user flows
3. **Error monitoring** — check Sentry/error tracker for new errors
4. **Performance** — check response times haven't degraded
5. **Logs** — watch logs for the first few minutes

## Deployment Report Template

```markdown
# Deployment Report

**Target:** [staging | production]
**Platform:** [Vercel | Docker | Fly.io | ...]
**Date:** [ISO date]
**Commit:** [short SHA + message]
**URL:** [deployment URL]

## Pre-Deploy Checks
| Check | Status |
|-------|--------|
| Build | PASS |
| Tests | PASS |
| Env Vars | PASS |
| Clean working tree | PASS |

## Deployment
- Command: `vercel --prod`
- Duration: [time]
- Status: SUCCESS | FAILED

## Post-Deploy Verification
| Check | Status | Notes |
|-------|--------|-------|
| Health endpoint | PASS | 200 OK in 120ms |
| Smoke tests | PASS | All critical flows work |
| Error monitoring | PASS | No new errors |
| Performance | PASS | p95 latency < 500ms |
```
