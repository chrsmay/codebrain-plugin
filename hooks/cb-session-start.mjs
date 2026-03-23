#!/usr/bin/env node
/**
 * cb-session-start.mjs — SessionStart hook for CodeBrain
 * Loads project memory from .codebrain/ directory,
 * initializes dedup state, outputs context.
 * Replaces the original bash session-start script.
 */

import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  readStdinJson, writeHookOutput, safeReadFile,
  removeSessionArtifacts,
} from "./cb-env.mjs";

// ── Main ─────────────────────────────────────────────────
async function main() {
  const input = await readStdinJson();
  const sessionId = input.session_id || "default";
  const event = input.event || input.matcher || "startup";

  // Handle clear/compact events
  if (event === "clear") {
    removeSessionArtifacts(sessionId);
  }

  if (event === "compact") {
    // Signal compaction for PreToolUse to re-inject high-priority skills
    process.env.CODEBRAIN_CONTEXT_COMPACTED = "true";
  }

  // Find .codebrain/ directory by walking up from cwd
  const codebrainDir = findCodebrainDir(process.cwd());

  if (!codebrainDir) {
    writeHookOutput(
      "[codebrain] No .codebrain/ directory found. Run /codebrain:memory reset to initialize.\n\n" +
      "Available commands: /codebrain:plan, /codebrain:epic, /codebrain:review, /codebrain:verify, " +
      "/codebrain:yolo, /codebrain:quality, /codebrain:memory, /codebrain:debug, /codebrain:discover, " +
      "/codebrain:prd, /codebrain:design, /codebrain:launch, /codebrain:retro, /codebrain:analyze, " +
      "/codebrain:refactor, /codebrain:map-journeys, /codebrain:observe, /codebrain:investigate, " +
      "/codebrain:deploy, /codebrain:browser-verify"
    );
    return;
  }

  // Load memory files
  const memoryDir = join(codebrainDir, "memory");
  const parts = [];

  // Constitution (foundational)
  const constitution = loadMemoryFile(memoryDir, "constitution.md");
  if (constitution) {
    parts.push("[codebrain] Project constitution loaded:");
    parts.push(constitution);
  }

  // Continuity (most important for session context)
  const continuity = loadMemoryFile(memoryDir, "continuity.md");
  if (continuity) {
    parts.push("\n[codebrain] Continuity notes:");
    parts.push(continuity);
  }

  // Known issues (brief)
  const issues = loadMemoryFile(memoryDir, "known-issues.md");
  if (issues) {
    parts.push("\n[codebrain] Known issues:");
    parts.push(issues);
  }

  // Architecture summary
  const architecture = loadMemoryFile(memoryDir, "architecture.md");
  if (architecture) {
    parts.push("\n[codebrain] Architecture:");
    parts.push(architecture);
  }

  if (parts.length === 0) {
    parts.push("[codebrain] .codebrain/ exists but memory is empty. Run /codebrain:memory reset to initialize.");
  }

  // Add available commands
  parts.push(
    "\n[codebrain] Available commands: /codebrain:plan, /codebrain:epic, /codebrain:review, " +
    "/codebrain:verify, /codebrain:yolo, /codebrain:quality, /codebrain:memory, /codebrain:debug, " +
    "/codebrain:discover, /codebrain:prd, /codebrain:design, /codebrain:launch, /codebrain:retro, " +
    "/codebrain:analyze, /codebrain:refactor, /codebrain:map-journeys, /codebrain:observe, " +
    "/codebrain:investigate, /codebrain:deploy, /codebrain:browser-verify"
  );

  writeHookOutput(parts.join("\n"));
}

/**
 * Walk up from a directory to find .codebrain/
 */
function findCodebrainDir(startDir) {
  let dir = startDir;
  const root = dirname(dir) === dir ? dir : undefined; // filesystem root

  while (dir) {
    const candidate = join(dir, ".codebrain");
    if (existsSync(candidate)) return candidate;

    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  return null;
}

/**
 * Load a memory file, returning its content or null if empty/default.
 */
function loadMemoryFile(memoryDir, filename) {
  const filePath = join(memoryDir, filename);
  const content = safeReadFile(filePath);

  if (!content) return null;

  // Skip default/empty content
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith("_No entries yet._")) return null;

  return content;
}

// ── Run ──────────────────────────────────────────────────
main().catch(() => writeHookOutput(null));
