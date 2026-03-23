# CodeBrain — Claude Code Plugin

Spec-driven development engine that replaces Traycer AI. Complete lifecycle from idea to shipped product with persistent project memory, code quality enforcement, and multi-agent orchestration.

## Features

- **16 skills** covering the full development lifecycle: discover → PRD → journey mapping → design → epic → plan → implement → verify → review → quality → debug → refactor → analyze → launch → retro
- **4 specialized agents**: planner, verifier, api-researcher, epic orchestrator (bart)
- **10 MCP servers** (all free): codebase knowledge graph, impact analysis, ESLint, supply chain security, test coverage, error tracking, structured CLI output, Lighthouse, and a custom artifact/workflow/memory server
- **2 hooks**: SessionStart (context loading), PostToolUse (type-check gate)
- **Constitution-driven**: SOLID principles, code simplicity hard limits, and forbidden anti-patterns enforced on every change
- **Drift prevention**: `[NEEDS CLARIFICATION]` markers, `[SPEC_DEVIATION]` detection, task recitation, fresh context per task, circuit breakers
- **Linear integration**: Syncs epics, tickets, and status with Linear

## Install

```bash
# Clone into Claude Code plugins directory
git clone https://github.com/ChristianMayfieldIT1025/codebrain-plugin.git ~/.claude/plugins/codebrain

# Build the MCP server
cd ~/.claude/plugins/codebrain/mcp-server && npm install && npm run build

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
/codebrain:verify         → Spec compliance check
/codebrain:review         → Agentic code review
/codebrain:quality        → Dead code, stubs, duplicates scan
/codebrain:debug          → Systematic debugging
/codebrain:refactor       → Safe restructuring
/codebrain:analyze        → Cross-artifact consistency check
/codebrain:launch         → Pre-launch checklist + rollout plan
/codebrain:retro          → Retrospective + next iteration
```

## License

MIT
