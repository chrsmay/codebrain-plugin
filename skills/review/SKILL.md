---
name: review
description: "Use when reviewing code for bugs, performance issues, security vulnerabilities, or quality problems. Deep agentic review that reads full files and traces imports, not just diffs. Categorizes by severity."
---

# CodeBrain Review

Agentic code review with severity ratings. Reviews full files (not just diffs), traces imports, and categorizes findings.

## Usage

`/codebrain:review [path]`

- If path provided: review that specific file or directory
- If no path: review all uncommitted changes (git diff)
- On a feature branch: review all changes vs. main

## Workflow

1. **Determine scope.**
   - If argument provided: use that path
   - If on a feature branch: `git diff --name-only main...HEAD`
   - Otherwise: `git diff --name-only HEAD` + `git diff --name-only --staged`
   - If no changes found: ask what to review

2. **Read project conventions.**
   - Call `mcp__codebrain__codebrain_config_read` for project settings
   - Read conventions file (CLAUDE.md or equivalent)

3. **Analyze blast radius** (for large codebases).
   - If code-review-graph MCP is available:
     - Call `mcp__code_review_graph__get_impact_radius_tool` for each changed file
     - Call `mcp__code_review_graph__get_review_context_tool` to load optimal review context
   - If codebase-memory MCP is available:
     - Call `mcp__codebase_memory__trace_call_path` for changed functions to find all consumers
   - Add blast radius files to the review scope

4. **Spawn the verifier agent in review mode** with:
   - List of files to review (including blast radius files)
   - Blast radius analysis results
   - Instructions to:
     a. Read each file in full (not just the diff — context matters)
     b. Use knowledge graph to trace callers and consumers of changed interfaces
     c. Check blast radius files for regressions (broken imports, changed contracts)
     d. Categorize findings as: Bug, Performance, Security, Clarity
     e. Assign severity: Critical, Major, Minor
     f. Provide fix suggestions for each finding
     g. Reference file:line for every finding

4. **Present the review report.**
   - Organized by severity (Critical first)
   - Each finding with category, file:line, description, and fix suggestion

5. **Offer fix options.**
   - "Fix all Critical+Major" → implement fixes, then re-review changed files only
   - "Fix specific issue" → fix one finding
   - "Dismiss" → accept as-is

6. **Persist the review.**
   - Save to `.codebrain/reviews/{date}-{branch-or-scope}.md` via MCP tools

## What Makes This Different from a Diff Review

- Reads **full files**, not diffs — catches issues in the surrounding context
- **Traces imports** — reads referenced modules to verify API contracts
- Checks against **project conventions** — catches style/pattern violations
- Categories are **actionable** — Bug/Performance/Security/Clarity, not vague "suggestion"
