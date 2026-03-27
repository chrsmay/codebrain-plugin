# CodeBrain — Claude Code Plugin

Spec-driven development engine that replaces Traycer AI. Complete lifecycle from idea to shipped product with persistent project memory, code quality enforcement, and multi-agent orchestration.

## Features

- **21 skills** covering the full development lifecycle: discover → PRD → journey mapping → design → epic → plan → yolo/autopilot → verify → review → quality → debug → investigate → observe → refactor → analyze → deploy → browser-verify → launch → retro
- **4 specialized agents**: planner, verifier, api-researcher, epic orchestrator (bart)
- **9 MCP servers** (all free): codebase knowledge graph, code review graph, ESLint, supply chain security (Socket), test coverage, error tracking (Sentry), Pare (git analysis), Lighthouse, and a custom artifact/workflow/memory server
- **5 hook events**: SessionStart (context loading), PreToolUse (skill injection), UserPromptSubmit (prompt signal matching), PostToolUse (typecheck + chain-to), SessionEnd (cleanup)
- **Constitution-driven**: SOLID principles, code simplicity hard limits, and forbidden anti-patterns enforced on every change
- **Drift prevention**: `[NEEDS CLARIFICATION]` markers, `[SPEC_DEVIATION]` detection, task recitation, fresh context per task, circuit breakers
- **Linear integration**: Syncs epics, tickets, and status with Linear

## Install

```bash
# Clone anywhere on your machine
git clone https://github.com/chrsmay/codebrain-plugin.git ~/codebrain-plugin

# Build the MCP server
cd ~/codebrain-plugin/mcp-server && npm install && npm run build

# Register the plugin with Claude Code
claude plugin add ~/codebrain-plugin

# Restart Claude Code — plugin auto-discovers
```

## First Use

```
/codebrain:memory reset
```

This scaffolds `.codebrain/`, auto-detects your project stack, generates a constitution, and creates initial memory files.

## The Lifecycle

```
/codebrain:discover       → Is this worth building?
/codebrain:prd            → What exactly are we building?
/codebrain:map-journeys   → What are ALL the user paths?
/codebrain:design         → UI mockups (Pencil.dev)
/codebrain:epic create    → Tech specs + tickets (syncs to Linear)
/codebrain:plan           → Implementation plan for each ticket
/codebrain:yolo           → Automated plan→implement→verify→commit
/codebrain:autopilot      → Fire-and-forget via Remote Control
/codebrain:verify         → Spec compliance check
/codebrain:review         → Agentic code review
/codebrain:quality        → Dead code, stubs, duplicates scan
/codebrain:debug          → Systematic debugging
/codebrain:investigate    → Deep multi-system investigation
/codebrain:observe        → Orchestrated debugging coordinator
/codebrain:refactor       → Safe restructuring
/codebrain:analyze        → Cross-artifact consistency check
/codebrain:deploy         → Deployment orchestration
/codebrain:browser-verify → Visual UI verification
/codebrain:launch         → Pre-launch checklist + rollout plan
/codebrain:retro          → Retrospective + next iteration
```

## License

MIT
