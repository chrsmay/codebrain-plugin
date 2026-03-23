---
name: browser-verify
description: "Browser-based verification of UI changes. Checks that pages load, elements render correctly, no console errors. Triggers after dev server start or accumulated UI file changes. Use when visual verification is needed — blank pages, broken layouts, missing elements."
metadata:
  priority: 6
  pathPatterns:
    - "**/*.tsx"
    - "**/*.jsx"
    - "**/*.css"
    - "**/*.scss"
    - "**/tailwind.config*"
    - "**/globals.css"
    - "**/layout.tsx"
    - "**/layout.jsx"
    - "**/page.tsx"
    - "**/page.jsx"
  bashPatterns:
    - "\\bnext\\s+dev\\b"
    - "\\bnpm\\s+run\\s+dev\\b"
    - "\\bpnpm\\s+dev\\b"
    - "\\bvite\\b"
    - "\\bagent-browser\\b"
  promptSignals:
    phrases:
      - "check in the browser"
      - "does it look right"
      - "visual check"
      - "browser test"
      - "check the UI"
      - "blank page"
      - "white screen"
      - "console errors"
      - "nothing rendering"
      - "UI is broken"
      - "page is empty"
      - "verify visually"
      - "screenshot"
      - "check the page"
    allOf:
      - [check, browser]
      - [verify, ui]
      - [blank, page]
      - [console, errors]
    anyOf:
      - "browser"
      - "visual"
      - "rendering"
      - "blank page"
    noneOf:
      - "unit test"
      - "api test"
      - "integration test"
---

# CodeBrain Browser Verify

Browser-based visual verification for UI changes. Quick gut-check that pages load, render correctly, and have no console errors.

## Usage

`/codebrain:browser-verify [url]`

- If URL provided: verify that specific page
- If no URL: detect dev server from recent commands and verify localhost

## When to Use

- After starting a dev server (`npm run dev`, `next dev`, `vite`)
- After editing multiple UI files (components, layouts, styles)
- When a user reports "blank page" or "nothing rendering"
- Before claiming UI work is done

## Dev Server Detection

Look for a running dev server:

1. Check recent bash history for dev commands
2. Check common ports: 3000, 3001, 5173, 8080, 4321
3. Curl the detected URL to verify it responds

```bash
# Quick port check
curl -sI http://localhost:3000 --max-time 3 2>/dev/null | head -1
curl -sI http://localhost:5173 --max-time 3 2>/dev/null | head -1
```

## Verification Checklist

### 1. Page Loads
- [ ] Server responds with 200 OK
- [ ] HTML content is returned (not empty body)
- [ ] Page is not stuck on loading spinner
- [ ] No framework error overlay (Next.js red box, Vite error overlay)

### 2. No Console Errors
- [ ] No JavaScript errors in console
- [ ] No unhandled promise rejections
- [ ] No React hydration mismatches
- [ ] No 404s for critical resources (JS, CSS, fonts)
- [ ] No CORS errors on API requests

### 3. Key Elements Render
- [ ] Navigation/header is visible
- [ ] Main content area is populated (not empty)
- [ ] No broken images (alt text showing instead of image)
- [ ] Text is readable (correct font loaded, no FOIT/FOUT issues)
- [ ] Layout is not collapsed (elements have correct dimensions)

### 4. Interactive Elements Work
- [ ] Buttons are clickable (not disabled or overlapped)
- [ ] Links navigate correctly
- [ ] Forms accept input
- [ ] Dropdowns/modals open

### 5. Accessibility Quick-Check
- [ ] Page has a `<title>`
- [ ] Main content is in a `<main>` element
- [ ] Images have `alt` attributes
- [ ] Sufficient color contrast (text is readable)
- [ ] Page is navigable with keyboard (Tab key)

## Using Agent Browser (if available)

If `agent-browser` is installed, use it for automated verification:

```bash
# Navigate to page and take screenshot
agent-browser navigate http://localhost:3000

# Check for console errors
agent-browser console-errors

# Take screenshot for visual verification
agent-browser screenshot
```

If agent-browser is not available, use manual curl checks and ask the user to verify visually.

## Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Blank page | Client-side error crashing React | Check browser console for errors |
| White screen of death | Build error in production | Run `npm run build` to check |
| Hydration mismatch | Server/client HTML differs | Check for `typeof window` guards |
| Missing styles | CSS not loading | Check import paths, Tailwind config |
| Broken layout | CSS changes broke grid/flex | Compare with previous state |
| Font not loading | next/font config error | Check font variable names in layout |
| 404 on assets | Wrong public path | Check `basePath` in next.config |
| CORS error | API route misconfigured | Check API response headers |

## Verification Report

```markdown
## Browser Verification Report

**URL:** [checked URL]
**Date:** [ISO date]
**Status:** PASS | FAIL

### Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Page loads | PASS/FAIL | [response time, status code] |
| No console errors | PASS/FAIL | [error count, key errors] |
| Key elements render | PASS/FAIL | [what's missing] |
| Interactive elements | PASS/FAIL | [what's broken] |
| Accessibility | PASS/FAIL | [issues found] |

### Issues Found
| # | Severity | Description | File:Line |
|---|----------|-------------|-----------|
| 1 | ... | ... | ... |
```

## When to Escalate

- **To `/codebrain:observe`** — server not responding at all
- **To `/codebrain:debug`** — specific JavaScript error identified
- **To `/codebrain:investigate`** — intermittent rendering issues
