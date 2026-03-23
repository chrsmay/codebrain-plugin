#!/usr/bin/env node
/**
 * cb-posttooluse-chain.mjs — PostToolUse chain-to + validation + typecheck
 * Fires after Write/Edit/Bash. Reads file content, matches chainTo rules,
 * injects target skills. Also preserves the existing typecheck-gate behavior.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  pluginRoot, readStdinJson, writeHookOutput, safeReadFile,
  tryClaimSkill, listClaimedSkills,
} from "./cb-env.mjs";
import { buildSkillMap } from "./cb-skill-map.mjs";
import { compileSkillPatterns, matchPathWithReason } from "./cb-patterns.mjs";

// ── Constants ────────────────────────────────────────────
const CHAIN_BUDGET_BYTES = 18000;
const CHAIN_CAP = 2;

// ── Main ─────────────────────────────────────────────────
async function main() {
  const input = await readStdinJson();
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const sessionId = input.session_id || "default";
  const filePath = toolInput.file_path || "";

  const parts = [];

  // ── Typecheck gate (preserved from original) ──────────
  if ((toolName === "Write" || toolName === "Edit") && filePath) {
    const typecheckResult = runTypecheck(filePath);
    if (typecheckResult) {
      parts.push(typecheckResult);
    }
  }

  // ── Chain-to rule matching ─────────────────────────────
  if ((toolName === "Write" || toolName === "Edit") && filePath) {
    const chainResult = runChainTo(filePath, sessionId);
    if (chainResult) {
      parts.push(chainResult);
    }
  }

  if (parts.length === 0) {
    return writeHookOutput(null);
  }

  writeHookOutput(parts.join("\n\n"));
}

/**
 * Run typecheck on a modified file (from original typecheck-gate).
 * Returns warning string or null.
 */
function runTypecheck(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase();

  try {
    if ((ext === "ts" || ext === "tsx") && existsSync("tsconfig.json")) {
      const output = execSync("npx tsc --noEmit --pretty false 2>&1", {
        encoding: "utf-8",
        timeout: 15000,
      }).toString();

      const basename = filePath.replace(/\\/g, "/").split("/").pop();
      const fileErrors = output
        .split("\n")
        .filter(line => line.includes(basename) && line.includes("error TS"))
        .slice(0, 5);

      if (fileErrors.length > 0) {
        return `[codebrain typecheck] TypeScript errors in modified file:\n${fileErrors.join("\n")}`;
      }
    } else if (ext === "py") {
      try {
        const output = execSync(`ruff check --select E,F "${filePath}" 2>&1`, {
          encoding: "utf-8",
          timeout: 10000,
        }).toString();

        if (output && !output.includes("All checks passed")) {
          const lines = output.split("\n").slice(0, 5).join("\n");
          return `[codebrain typecheck] Python issues:\n${lines}`;
        }
      } catch { /* ruff not available */ }
    }
  } catch { /* typecheck failed, non-blocking */ }

  return null;
}

/**
 * Run chain-to rules for a written/edited file.
 * Reads file content, matches against chainTo patterns, injects target skills.
 */
function runChainTo(filePath, sessionId) {
  const root = pluginRoot();
  const skillMap = buildSkillMap(join(root, "skills"));
  const compiled = compileSkillPatterns(skillMap);

  // Find which skills match this file path
  const matchedSkills = [];
  for (const [name, patterns] of Object.entries(compiled)) {
    if (!patterns.pathRegexes.length) continue;
    const reason = matchPathWithReason(filePath, patterns.pathRegexes);
    if (reason) matchedSkills.push(name);
  }

  if (matchedSkills.length === 0) return null;

  // Read the file content to match chainTo patterns
  const content = safeReadFile(filePath);
  if (!content) return null;

  // Collect chain-to targets
  const seenSkills = new Set(listClaimedSkills(sessionId));
  const chains = [];
  const seenTargets = new Set();

  for (const skillName of matchedSkills) {
    const skill = skillMap[skillName];
    if (!skill?.chainTo?.length) continue;

    for (const rule of skill.chainTo) {
      const targetSkill = rule.targetSkill || rule.target;
      if (!targetSkill) continue;
      if (seenTargets.has(targetSkill)) continue;
      if (seenSkills.has(targetSkill)) continue;

      const pattern = rule.pattern;
      if (!pattern) continue;

      try {
        const regex = new RegExp(pattern, "m");
        if (regex.test(content)) {
          seenTargets.add(targetSkill);
          chains.push({
            sourceSkill: skillName,
            targetSkill,
            message: rule.message || `Chained from ${skillName}`,
            pattern,
          });
        }
      } catch { /* invalid regex */ }
    }
  }

  if (chains.length === 0) return null;

  // Inject chained skills with budget
  const parts = [];
  let totalBytes = 0;
  let injected = 0;

  parts.push("[codebrain] Chain-to skills triggered:");

  for (const chain of chains) {
    if (injected >= CHAIN_CAP) break;

    const targetSkillData = skillMap[chain.targetSkill];
    if (!targetSkillData) continue;

    const skillContent = `--- codebrain:${chain.targetSkill} (chained from ${chain.sourceSkill}) ---\n` +
      `# codebrain:${chain.targetSkill}\n\n` +
      `Invoke with: /codebrain:${chain.targetSkill}\n` +
      `Chain reason: ${chain.message}\n\n` +
      (targetSkillData.body || "") +
      `\n--- end codebrain:${chain.targetSkill} ---`;

    const byteLen = Buffer.byteLength(skillContent, "utf-8");
    if (totalBytes + byteLen > CHAIN_BUDGET_BYTES) break;

    // Claim in dedup
    tryClaimSkill(sessionId, chain.targetSkill);

    parts.push(`  - "${chain.targetSkill}" chained from "${chain.sourceSkill}": ${chain.message}`);
    parts.push("");
    parts.push(skillContent);

    totalBytes += byteLen;
    injected++;
  }

  if (injected === 0) return null;

  return parts.join("\n");
}

// ── Run ──────────────────────────────────────────────────
main().catch(() => writeHookOutput(null));
