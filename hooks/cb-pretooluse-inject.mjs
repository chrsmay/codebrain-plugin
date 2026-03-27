#!/usr/bin/env node
/**
 * cb-pretooluse-inject.mjs — Core PreToolUse injection engine for CodeBrain
 * Fires on Read/Edit/Write/Bash tool calls.
 * Matches tool targets against skill pathPatterns/bashPatterns,
 * deduplicates, ranks by priority, respects budget, outputs additionalContext.
 * Fully synchronous to avoid timeout/cancellation issues.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compileSkillPatterns, matchPathWithReason, matchBashWithReason, rankEntries } from "./cb-patterns.mjs";
import { buildSkillMap } from "./cb-skill-map.mjs";
import { tryClaimSkill, listClaimedSkills, clearHighPrioritySkills } from "./cb-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");

// ── Constants ────────────────────────────────────────────
const MAX_SKILLS = 3;
const INJECTION_BUDGET_BYTES = 18000;
const COMPACTION_REINJECT_PRIORITY = 7;

// ── Read stdin synchronously ─────────────────────────────
let input = {};
try {
  const raw = readFileSync(0, { encoding: "utf-8" });
  if (raw) input = JSON.parse(raw);
} catch {
  // No stdin available — exit cleanly
  process.stdout.write("{}");
  process.exit(0);
}

const toolName = input.tool_name || "";
const toolInput = input.tool_input || {};
const sessionId = input.session_id || "default";

function out(additionalContext) {
  if (!additionalContext) { process.stdout.write("{}"); }
  else { process.stdout.write(JSON.stringify({ hookSpecificOutput: { additionalContext } })); }
  process.exit(0);
}

// ── Load skills ──────────────────────────────────────────
const skillMap = buildSkillMap(join(PLUGIN_ROOT, "skills"));
const compiled = compileSkillPatterns(skillMap);

// ── Check for compaction reset ───────────────────────────
if (process.env.CODEBRAIN_CONTEXT_COMPACTED === "true") {
  clearHighPrioritySkills(sessionId, skillMap, COMPACTION_REINJECT_PRIORITY);
  delete process.env.CODEBRAIN_CONTEXT_COMPACTED;
}

// ── Match skills against tool target ─────────────────────
const matches = [];

if (toolName === "Bash") {
  const command = toolInput.command || "";
  if (!command) out(null);

  for (const [name, patterns] of Object.entries(compiled)) {
    if (!patterns.bashRegexes.length) continue;
    const reason = matchBashWithReason(command, patterns.bashRegexes);
    if (reason) matches.push({ skill: name, priority: skillMap[name].priority || 0, reason });
  }
} else if (["Read", "Edit", "Write"].includes(toolName)) {
  const filePath = toolInput.file_path || "";
  if (!filePath) out(null);

  for (const [name, patterns] of Object.entries(compiled)) {
    if (!patterns.pathRegexes.length) continue;
    const reason = matchPathWithReason(filePath, patterns.pathRegexes);
    if (reason) matches.push({ skill: name, priority: skillMap[name].priority || 0, reason });
  }
} else {
  out(null);
}

if (matches.length === 0) out(null);

// ── Dedup against seen skills ────────────────────────────
const seenSkills = new Set(listClaimedSkills(sessionId));
const fresh = matches.filter(m => !seenSkills.has(m.skill));
if (fresh.length === 0) out(null);

// ── Rank by priority ─────────────────────────────────────
const ranked = rankEntries(fresh);

// ── Inject with budget management ────────────────────────
const injected = [];
const summaryOnly = [];
const droppedByCap = [];
let usedBytes = 0;

for (const entry of ranked) {
  if (injected.length >= MAX_SKILLS) { droppedByCap.push(entry.skill); continue; }

  const skill = skillMap[entry.skill];
  if (!skill) continue;

  const content = `# codebrain:${entry.skill}\n\nInvoke with: /codebrain:${entry.skill}\n\n${skill.body || ""}`;
  const byteLen = Buffer.byteLength(content, "utf-8");

  if (injected.length > 0 && usedBytes + byteLen > INJECTION_BUDGET_BYTES) {
    const summary = `You must run the Skill(codebrain:${entry.skill}) tool.`;
    const summaryBytes = Buffer.byteLength(summary, "utf-8");
    if (usedBytes + summaryBytes <= INJECTION_BUDGET_BYTES) {
      summaryOnly.push({ skill: entry.skill, summary });
      usedBytes += summaryBytes;
    }
    continue;
  }

  if (!tryClaimSkill(sessionId, entry.skill)) continue;

  injected.push({ skill: entry.skill, content });
  usedBytes += byteLen;
}

if (injected.length === 0 && summaryOnly.length === 0) out(null);

// ── Build output ─────────────────────────────────────────
const parts = [];
parts.push("[codebrain] Skills auto-injected based on detected patterns:");
for (const i of injected) {
  const match = ranked.find(r => r.skill === i.skill);
  parts.push(`  - "${i.skill}" matched: ${match?.reason?.matchType || "pattern"} (${match?.reason?.pattern || ""})`);
}
parts.push("");

for (const i of injected) {
  parts.push(`--- codebrain:${i.skill} ---`);
  parts.push(i.content);
  parts.push(`--- end codebrain:${i.skill} ---`);
  parts.push("");
}

for (const s of summaryOnly) { parts.push(s.summary); }

const meta = { version: 1, hookEvent: "PreToolUse", toolName, matchedSkills: ranked.map(r => r.skill), injectedSkills: injected.map(i => i.skill), summaryOnly: summaryOnly.map(s => s.skill), droppedByCap };
parts.push(`<!-- codebrain:skillInjection: ${JSON.stringify(meta)} -->`);

out(parts.join("\n"));
