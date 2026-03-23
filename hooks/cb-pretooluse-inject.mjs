#!/usr/bin/env node
/**
 * cb-pretooluse-inject.mjs — Core PreToolUse injection engine for CodeBrain
 * Fires on Read/Edit/Write/Bash tool calls.
 * Matches tool targets against skill pathPatterns/bashPatterns,
 * deduplicates, ranks by priority, respects budget, outputs additionalContext.
 */

import { join } from "node:path";
import {
  pluginRoot, readStdinJson, writeHookOutput, safeReadFile,
  tryClaimSkill, listClaimedSkills, clearHighPrioritySkills,
} from "./cb-env.mjs";
import {
  compileSkillPatterns, matchPathWithReason, matchBashWithReason, rankEntries,
} from "./cb-patterns.mjs";
import { buildSkillMap } from "./cb-skill-map.mjs";

// ── Constants ────────────────────────────────────────────
const MAX_SKILLS = 3;
const INJECTION_BUDGET_BYTES = 18000;
const COMPACTION_REINJECT_PRIORITY = 7;
const SUMMARY_TEMPLATE = (skill) =>
  `You must run the Skill(codebrain:${skill}) tool.`;

// ── Cached state ─────────────────────────────────────────
let cachedSkillMap = null;
let cachedCompiled = null;

function loadSkills() {
  if (cachedSkillMap) return { skillMap: cachedSkillMap, compiled: cachedCompiled };

  const root = pluginRoot();
  const skillsDir = join(root, "skills");
  cachedSkillMap = buildSkillMap(skillsDir);
  cachedCompiled = compileSkillPatterns(cachedSkillMap);

  return { skillMap: cachedSkillMap, compiled: cachedCompiled };
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  const input = await readStdinJson();
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const sessionId = input.session_id || "default";

  // Check for compaction reset
  if (process.env.CODEBRAIN_CONTEXT_COMPACTED === "true") {
    const { skillMap } = loadSkills();
    clearHighPrioritySkills(sessionId, skillMap, COMPACTION_REINJECT_PRIORITY);
    // Clear the flag (best effort — env vars may not persist across hooks)
    delete process.env.CODEBRAIN_CONTEXT_COMPACTED;
  }

  const { skillMap, compiled } = loadSkills();

  // ── Match skills against tool target ───────────────────
  const matches = [];

  if (toolName === "Bash") {
    const command = toolInput.command || "";
    if (!command) return writeHookOutput(null);

    for (const [name, patterns] of Object.entries(compiled)) {
      if (!patterns.bashRegexes.length) continue;
      const reason = matchBashWithReason(command, patterns.bashRegexes);
      if (reason) {
        matches.push({
          skill: name,
          priority: skillMap[name].priority || 0,
          reason,
        });
      }
    }
  } else if (["Read", "Edit", "Write"].includes(toolName)) {
    const filePath = toolInput.file_path || "";
    if (!filePath) return writeHookOutput(null);

    for (const [name, patterns] of Object.entries(compiled)) {
      if (!patterns.pathRegexes.length) continue;
      const reason = matchPathWithReason(filePath, patterns.pathRegexes);
      if (reason) {
        matches.push({
          skill: name,
          priority: skillMap[name].priority || 0,
          reason,
        });
      }
    }
  } else {
    return writeHookOutput(null);
  }

  if (matches.length === 0) return writeHookOutput(null);

  // ── Dedup against seen skills ──────────────────────────
  const seenSkills = new Set(listClaimedSkills(sessionId));
  const fresh = matches.filter(m => !seenSkills.has(m.skill));

  if (fresh.length === 0) return writeHookOutput(null);

  // ── Rank by priority ───────────────────────────────────
  const ranked = rankEntries(fresh);

  // ── Inject with budget management ──────────────────────
  const injected = [];
  const summaryOnly = [];
  const droppedByCap = [];
  let usedBytes = 0;

  for (const entry of ranked) {
    if (injected.length >= MAX_SKILLS) {
      droppedByCap.push(entry.skill);
      continue;
    }

    const skill = skillMap[entry.skill];
    if (!skill) continue;

    // Build the injection content
    const content = buildSkillContent(entry.skill, skill);
    const byteLen = Buffer.byteLength(content, "utf-8");

    if (injected.length > 0 && usedBytes + byteLen > INJECTION_BUDGET_BYTES) {
      // Try summary-only fallback
      const summary = SUMMARY_TEMPLATE(entry.skill);
      const summaryBytes = Buffer.byteLength(summary, "utf-8");

      if (usedBytes + summaryBytes <= INJECTION_BUDGET_BYTES) {
        summaryOnly.push({ skill: entry.skill, summary });
        usedBytes += summaryBytes;
      }
      continue;
    }

    // Claim the skill in session dedup
    if (!tryClaimSkill(sessionId, entry.skill)) {
      continue; // Another process claimed it
    }

    injected.push({ skill: entry.skill, content });
    usedBytes += byteLen;
  }

  if (injected.length === 0 && summaryOnly.length === 0) {
    return writeHookOutput(null);
  }

  // ── Build output ───────────────────────────────────────
  const parts = [];

  // Banner
  parts.push("[codebrain] Skills auto-injected based on detected patterns:");
  for (const i of injected) {
    const match = ranked.find(r => r.skill === i.skill);
    parts.push(`  - "${i.skill}" matched: ${match?.reason?.matchType || "pattern"} (${match?.reason?.pattern || ""})`);
  }

  parts.push("");

  // Full skill content
  for (const i of injected) {
    parts.push(`--- codebrain:${i.skill} ---`);
    parts.push(i.content);
    parts.push(`--- end codebrain:${i.skill} ---`);
    parts.push("");
  }

  // Summary-only references
  for (const s of summaryOnly) {
    parts.push(s.summary);
  }

  // Metadata comment
  const meta = {
    version: 1,
    hookEvent: "PreToolUse",
    toolName,
    matchedSkills: ranked.map(r => r.skill),
    injectedSkills: injected.map(i => i.skill),
    summaryOnly: summaryOnly.map(s => s.skill),
    droppedByCap,
  };
  parts.push(`<!-- codebrain:skillInjection: ${JSON.stringify(meta)} -->`);

  writeHookOutput(parts.join("\n"));
}

/**
 * Build injectable content for a skill.
 * Returns the skill body with a header.
 */
function buildSkillContent(name, skill) {
  const header = `# codebrain:${name}\n\nInvoke with: /codebrain:${name}\n\n`;
  return header + (skill.body || "");
}

// ── Run ──────────────────────────────────────────────────
main().catch(() => writeHookOutput(null));
