#!/usr/bin/env node
/**
 * cb-posttooluse-chain.mjs — PostToolUse chain-to + validation + typecheck
 * Fires after Write/Edit/Bash. Reads file content, matches chainTo rules,
 * injects target skills. Preserves typecheck-gate behavior.
 * Fully synchronous to avoid timeout/cancellation issues.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { buildSkillMap } from "./cb-skill-map.mjs";
import { compileSkillPatterns, matchPathWithReason } from "./cb-patterns.mjs";
import { tryClaimSkill, listClaimedSkills, safeReadFile } from "./cb-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");
const CHAIN_BUDGET_BYTES = 18000;
const CHAIN_CAP = 2;

// ── Read stdin synchronously ─────────────────────────────
let input = {};
try {
  const raw = readFileSync(0, { encoding: "utf-8" });
  if (raw) input = JSON.parse(raw);
} catch {
  process.stdout.write("{}");
  process.exit(0);
}

const toolName = input.tool_name || "";
const toolInput = input.tool_input || {};
const sessionId = input.session_id || "default";
const filePath = toolInput.file_path || "";

function out(additionalContext) {
  if (!additionalContext) { process.stdout.write("{}"); }
  else { process.stdout.write(JSON.stringify({ hookSpecificOutput: { additionalContext } })); }
  process.exit(0);
}

// ── Collect results ──────────────────────────────────────
const parts = [];

// ── Typecheck gate ───────────────────────────────────────
if ((toolName === "Write" || toolName === "Edit") && filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  try {
    if ((ext === "ts" || ext === "tsx") && existsSync("tsconfig.json")) {
      const output = execSync("npx tsc --noEmit --pretty false 2>&1", {
        encoding: "utf-8", timeout: 15000,
      }).toString();
      const basename = filePath.replace(/\\/g, "/").split("/").pop();
      const fileErrors = output.split("\n")
        .filter(line => line.includes(basename) && line.includes("error TS"))
        .slice(0, 5);
      if (fileErrors.length > 0) {
        parts.push(`[codebrain typecheck] TypeScript errors in modified file:\n${fileErrors.join("\n")}`);
      }
    } else if (ext === "py") {
      try {
        const output = execSync(`ruff check --select E,F "${filePath}" 2>&1`, {
          encoding: "utf-8", timeout: 10000,
        }).toString();
        if (output && !output.includes("All checks passed")) {
          parts.push(`[codebrain typecheck] Python issues:\n${output.split("\n").slice(0, 5).join("\n")}`);
        }
      } catch { /* ruff not available */ }
    }
  } catch { /* typecheck failed, non-blocking */ }
}

// ── Chain-to rule matching ───────────────────────────────
if ((toolName === "Write" || toolName === "Edit") && filePath) {
  const skillMap = buildSkillMap(join(PLUGIN_ROOT, "skills"));
  const compiled = compileSkillPatterns(skillMap);

  // Find which skills match this file path
  const matchedSkills = [];
  for (const [name, patterns] of Object.entries(compiled)) {
    if (!patterns.pathRegexes.length) continue;
    const reason = matchPathWithReason(filePath, patterns.pathRegexes);
    if (reason) matchedSkills.push(name);
  }

  if (matchedSkills.length > 0) {
    const content = safeReadFile(filePath);
    if (content) {
      const seenSkills = new Set(listClaimedSkills(sessionId));
      const chains = [];
      const seenTargets = new Set();

      for (const skillName of matchedSkills) {
        const skill = skillMap[skillName];
        if (!skill?.chainTo?.length) continue;

        for (const rule of skill.chainTo) {
          const targetSkill = rule.targetSkill || rule.target;
          if (!targetSkill || seenTargets.has(targetSkill) || seenSkills.has(targetSkill)) continue;

          try {
            if (new RegExp(rule.pattern, "m").test(content)) {
              seenTargets.add(targetSkill);
              chains.push({ sourceSkill: skillName, targetSkill, message: rule.message || `Chained from ${skillName}` });
            }
          } catch { /* invalid regex */ }
        }
      }

      if (chains.length > 0) {
        let totalBytes = 0;
        let injected = 0;
        const chainParts = ["[codebrain] Chain-to skills triggered:"];

        for (const chain of chains) {
          if (injected >= CHAIN_CAP) break;
          const targetData = skillMap[chain.targetSkill];
          if (!targetData) continue;

          const skillContent = `--- codebrain:${chain.targetSkill} (chained from ${chain.sourceSkill}) ---\n` +
            `# codebrain:${chain.targetSkill}\n\nInvoke with: /codebrain:${chain.targetSkill}\nChain reason: ${chain.message}\n\n` +
            (targetData.body || "") + `\n--- end codebrain:${chain.targetSkill} ---`;

          const byteLen = Buffer.byteLength(skillContent, "utf-8");
          if (totalBytes + byteLen > CHAIN_BUDGET_BYTES) break;

          tryClaimSkill(sessionId, chain.targetSkill);
          chainParts.push(`  - "${chain.targetSkill}" chained from "${chain.sourceSkill}": ${chain.message}`);
          chainParts.push("");
          chainParts.push(skillContent);
          totalBytes += byteLen;
          injected++;
        }

        if (injected > 0) parts.push(chainParts.join("\n"));
      }
    }
  }
}

if (parts.length === 0) out(null);
out(parts.join("\n\n"));
