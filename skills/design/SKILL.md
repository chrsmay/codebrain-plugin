---
name: design
description: "Use when creating UI mockups, wireframes, design systems, or visual prototypes before implementing frontend code. Uses Pencil.dev MCP to create designs in .pen files, validate visually with screenshots, then generate code from approved designs. Design-first workflow for UI features."
metadata:
  priority: 4
  pathPatterns:
    - "**/*.pen"
    - "**/design/**"
    - "**/mockup*"
    - "**/wireframe*"
  promptSignals:
    phrases:
      - "design the ui"
      - "mockup"
      - "wireframe"
      - "ui design"
      - "design a screen"
      - "what should it look like"
      - "visual design"
    allOf:
      - [design, ui]
      - [create, mockup]
    anyOf:
      - "design"
      - "mockup"
      - "wireframe"
    noneOf:
      - "system design"
      - "architecture design"
  chainTo:
    - pattern: "## Design Complete|## Mockup Ready"
      targetSkill: prd
      message: "Design ready - document requirements"
---

# CodeBrain Design

Design-first UI development using Pencil.dev. Create mockups in `.pen` files, validate visually, then implement from approved designs.

**Prerequisite:** Pencil.dev must be open BEFORE starting Claude Code. The Pencil MCP server runs locally when Pencil is open.

## Usage

`/codebrain:design <description>`
`/codebrain:design review` — screenshot and review current design
`/codebrain:design implement` — generate code from approved design

## Workflow: Create a Design

1. **Check Pencil is available.**
   - Call `mcp__pencil__get_editor_state` to verify Pencil is running
   - If not available: tell user to open Pencil.dev first, then restart Claude Code

2. **Open or create a .pen file.**
   - If a `.pen` file exists for this feature: call `mcp__pencil__open_document` with its path
   - If not: call `mcp__pencil__open_document` with `"new"` to create a blank canvas

3. **Load design guidelines.**
   - Call `mcp__pencil__get_guidelines` with the appropriate topic:
     - `web-app` for web applications
     - `mobile-app` for mobile designs
     - `landing-page` for marketing pages
     - `design-system` for component libraries
     - `tailwind` for Tailwind CSS-based projects
   - Call `mcp__pencil__get_style_guide_tags` then `mcp__pencil__get_style_guide` for visual inspiration

4. **Create the design** using `mcp__pencil__batch_design`:
   - Build the layout frame by frame
   - Use design tokens (variables) for colors, typography, spacing
   - Max 25 operations per `batch_design` call
   - Follow the loaded style guide for consistency

5. **Validate visually.**
   - Call `mcp__pencil__get_screenshot` to see the rendered design
   - Call `mcp__pencil__snapshot_layout` to check for overlapping/clipped elements
   - Fix any layout issues with additional `batch_design` calls

6. **Present to user for approval.**
   - Show the screenshot
   - Ask: "Does this match what you had in mind? Any changes?"
   - Iterate until approved

7. **Save design tokens.**
   - Call `mcp__pencil__get_variables` to extract design tokens
   - Save as `.codebrain/active/design-tokens.json` via codebrain MCP

## Workflow: Implement from Design

1. **Read the approved design.**
   - Call `mcp__pencil__batch_get` with patterns to read the design tree
   - Call `mcp__pencil__get_variables` for design tokens (colors, spacing, fonts)
   - Call `mcp__pencil__get_guidelines` with `topic: "code"` for code generation rules

2. **Generate implementation plan.**
   - Map design nodes to React/HTML components
   - Map design variables to CSS variables or Tailwind config
   - Create a plan via `/codebrain:plan` with the design as the spec

3. **Implement.**
   - Generate code following the plan
   - Use design tokens for all visual values (no hardcoded colors/sizes)

4. **Visual verification.**
   - If dev server is running: use Lighthouse MCP to check accessibility
   - Compare implementation screenshot against design screenshot
   - Flag any visual deviations

## Workflow: Design Review

1. Call `mcp__pencil__get_screenshot` for the current design
2. Call `mcp__pencil__snapshot_layout` with `problemsOnly: true` for layout issues
3. Present findings: overlapping elements, clipped content, inconsistent spacing

## Rules

- **Design before code.** For UI features, create the mockup first. Never start coding UI without a visual reference.
- **Use design tokens.** All colors, fonts, and spacing must come from variables — no hardcoded values.
- **Validate with screenshots.** Always call `get_screenshot` after design changes to verify visually.
- **.pen files are NOT readable with Read/Grep.** Always use Pencil MCP tools for .pen file access.
- **Export when done.** Call `mcp__pencil__export_nodes` to save finalized designs as PNG/PDF for documentation.
