/**
 * cb-env.mjs — Session environment utilities for CodeBrain plugin
 * Handles temp file paths, dedup claim directories, safe file I/O.
 * All temp files prefixed "codebrain-" to avoid collision with Vercel plugin.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve plugin root (parent of hooks/) */
export function pluginRoot() {
  return join(__dirname, "..");
}

/** Hash a session ID if it contains non-safe chars */
function safeSessionSegment(sessionId) {
  if (!sessionId) return "default";
  if (/^[a-zA-Z0-9_-]+$/.test(sessionId) && sessionId.length < 80) return sessionId;
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 24);
}

/** Get temp file path for a given session + kind */
export function dedupTempPath(sessionId, kind) {
  const seg = safeSessionSegment(sessionId);
  return join(tmpdir(), `codebrain-${seg}-${kind}`);
}

/** Get claim directory path (for atomic dedup) */
export function dedupClaimDir(sessionId, kind) {
  const dir = dedupTempPath(sessionId, kind) + ".d";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Try to claim a skill (atomic file creation in claim dir) */
export function tryClaimSkill(sessionId, skillName) {
  const dir = dedupClaimDir(sessionId, "seen-skills");
  const file = join(dir, encodeURIComponent(skillName));
  if (existsSync(file)) return false;
  try {
    writeFileSync(file, Date.now().toString(), { flag: "wx" });
    return true;
  } catch {
    return false; // already claimed by another process
  }
}

/** List all claimed skills for a session */
export function listClaimedSkills(sessionId) {
  const dir = dedupTempPath(sessionId, "seen-skills") + ".d";
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).map(f => decodeURIComponent(f));
  } catch {
    return [];
  }
}

/** Clear claimed skills above a priority threshold (for compaction reset) */
export function clearHighPrioritySkills(sessionId, skillMap, minPriority) {
  const dir = dedupTempPath(sessionId, "seen-skills") + ".d";
  if (!existsSync(dir)) return;
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      const skillName = decodeURIComponent(f);
      const skill = skillMap[skillName];
      if (skill && (skill.priority || 0) >= minPriority) {
        rmSync(join(dir, f), { force: true });
      }
    }
  } catch { /* ignore */ }
}

/** Remove all session temp artifacts */
export function removeSessionArtifacts(sessionId) {
  const seg = safeSessionSegment(sessionId);
  const tmp = tmpdir();
  try {
    const files = readdirSync(tmp);
    for (const f of files) {
      if (f.startsWith(`codebrain-${seg}-`)) {
        rmSync(join(tmp, f), { recursive: true, force: true });
      }
    }
  } catch { /* ignore */ }
}

/** Safe file read (returns empty string on error) */
export function safeReadFile(filePath) {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** Safe JSON parse (returns null on error) */
export function safeReadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/** Read stdin as JSON */
export async function readStdinJson() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", chunk => { data += chunk; });
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // Timeout after 3s to prevent hanging
    setTimeout(() => resolve({}), 3000);
  });
}

/** Write hook output to stdout */
export function writeHookOutput(additionalContext) {
  if (!additionalContext) {
    process.stdout.write("{}");
  } else {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { additionalContext }
    }));
  }
}
