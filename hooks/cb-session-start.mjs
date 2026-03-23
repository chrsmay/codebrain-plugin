#!/usr/bin/env node
/**
 * cb-session-start.mjs — SessionStart hook for CodeBrain
 * Loads project memory from .codebrain/ directory, outputs context.
 * Fully synchronous — no async stdin reads that can timeout/hang.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

// ── Read stdin synchronously ─────────────────────────────
let input = {};
try {
  const raw = readFileSync(0, { encoding: "utf-8" });
  if (raw) input = JSON.parse(raw);
} catch {
  // No stdin or invalid JSON — continue with defaults
}

const event = input.event || input.matcher || "startup";

if (event === "compact") {
  process.env.CODEBRAIN_CONTEXT_COMPACTED = "true";
}

// ── Find .codebrain/ directory ───────────────────────────
function findCodebrainDir(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, ".codebrain"))) return join(dir, ".codebrain");
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function safeRead(filePath) {
  try { return readFileSync(filePath, "utf-8"); } catch { return ""; }
}

function loadMemoryFile(memoryDir, filename) {
  const content = safeRead(join(memoryDir, filename));
  if (!content || !content.trim() || content.trim().endsWith("_No entries yet._")) return null;
  return content;
}

// ── Load project memory ──────────────────────────────────
const codebrainDir = findCodebrainDir(process.cwd());

const commands = "/codebrain:plan, /codebrain:epic, /codebrain:review, " +
  "/codebrain:verify, /codebrain:yolo, /codebrain:quality, /codebrain:memory, /codebrain:debug, " +
  "/codebrain:discover, /codebrain:prd, /codebrain:design, /codebrain:launch, /codebrain:retro, " +
  "/codebrain:analyze, /codebrain:refactor, /codebrain:map-journeys, /codebrain:observe, " +
  "/codebrain:investigate, /codebrain:deploy, /codebrain:browser-verify";

if (!codebrainDir) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      additionalContext: `[codebrain] No .codebrain/ directory found. Run /codebrain:memory reset to initialize.\n\nAvailable commands: ${commands}`
    }
  }));
  process.exit(0);
}

const memoryDir = join(codebrainDir, "memory");
const parts = [];

const constitution = loadMemoryFile(memoryDir, "constitution.md");
if (constitution) { parts.push("[codebrain] Project constitution loaded:"); parts.push(constitution); }

const continuity = loadMemoryFile(memoryDir, "continuity.md");
if (continuity) { parts.push("\n[codebrain] Continuity notes:"); parts.push(continuity); }

const issues = loadMemoryFile(memoryDir, "known-issues.md");
if (issues) { parts.push("\n[codebrain] Known issues:"); parts.push(issues); }

const architecture = loadMemoryFile(memoryDir, "architecture.md");
if (architecture) { parts.push("\n[codebrain] Architecture:"); parts.push(architecture); }

if (parts.length === 0) {
  parts.push("[codebrain] .codebrain/ exists but memory is empty. Run /codebrain:memory reset to initialize.");
}

parts.push(`\n[codebrain] Available commands: ${commands}`);

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { additionalContext: parts.join("\n") }
}));
process.exit(0);
