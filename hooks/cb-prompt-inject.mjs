#!/usr/bin/env node
/**
 * cb-prompt-inject.mjs — UserPromptSubmit prompt signal injection
 * Fires when the user submits a prompt. Scores the prompt against
 * all skills' promptSignals, selects top matches, injects as context.
 * Fully synchronous to avoid timeout/cancellation issues.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSkillMap } from "./cb-skill-map.mjs";
import { matchPromptAgainstSkills } from "./cb-prompt-patterns.mjs";
import { tryClaimSkill, listClaimedSkills } from "./cb-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");
const MAX_PROMPT_SKILLS = 2;
const PROMPT_BUDGET_BYTES = 8000;

// ── Read stdin synchronously ─────────────────────────────
let input = {};
try {
  const raw = readFileSync(0, { encoding: "utf-8" });
  if (raw) input = JSON.parse(raw);
} catch {
  process.stdout.write("{}");
  process.exit(0);
}

const userPrompt = input.user_prompt || input.prompt || "";
const sessionId = input.session_id || "default";

if (!userPrompt || userPrompt.length < 5) {
  process.stdout.write("{}");
  process.exit(0);
}

const skillMap = buildSkillMap(join(PLUGIN_ROOT, "skills"));
const matches = matchPromptAgainstSkills(userPrompt, skillMap);

if (matches.length === 0) {
  process.stdout.write("{}");
  process.exit(0);
}

// ── Dedup against seen skills ────────────────────────────
const seenSkills = new Set(listClaimedSkills(sessionId));
const fresh = matches.filter(m => !seenSkills.has(m.skill));

if (fresh.length === 0) {
  process.stdout.write("{}");
  process.exit(0);
}

// ── Inject top matches within budget ─────────────────────
const injected = [];
const summaryOnly = [];
let usedBytes = 0;

for (const match of fresh.slice(0, MAX_PROMPT_SKILLS + 2)) {
  if (injected.length >= MAX_PROMPT_SKILLS) break;

  const skill = skillMap[match.skill];
  if (!skill) continue;

  const content = `# codebrain:${match.skill}\n\nInvoke with: /codebrain:${match.skill}\n\n${skill.body || ""}`;
  const byteLen = Buffer.byteLength(content, "utf-8");

  if (injected.length > 0 && usedBytes + byteLen > PROMPT_BUDGET_BYTES) {
    const summary = `You must run the Skill(codebrain:${match.skill}) tool.`;
    const summaryBytes = Buffer.byteLength(summary, "utf-8");
    if (usedBytes + summaryBytes <= PROMPT_BUDGET_BYTES) {
      summaryOnly.push({ skill: match.skill, summary });
      usedBytes += summaryBytes;
    }
    continue;
  }

  if (!tryClaimSkill(sessionId, match.skill)) continue;

  injected.push({ skill: match.skill, content, score: match.score, matchedPhrases: match.matchedPhrases });
  usedBytes += byteLen;
}

if (injected.length === 0 && summaryOnly.length === 0) {
  process.stdout.write("{}");
  process.exit(0);
}

// ── Build output ─────────────────────────────────────────
const parts = [];
parts.push("[codebrain] Skills auto-suggested based on prompt analysis:");
for (const i of injected) {
  parts.push(`  - "${i.skill}" matched: prompt signal (score ${i.score}, phrases: ${i.matchedPhrases.join(", ")})`);
}
parts.push("");

for (const i of injected) {
  parts.push(`--- codebrain:${i.skill} ---`);
  parts.push(i.content);
  parts.push(`--- end codebrain:${i.skill} ---`);
  parts.push("");
}

for (const s of summaryOnly) {
  parts.push(s.summary);
}

const meta = { version: 1, hookEvent: "UserPromptSubmit", matchedSkills: matches.map(m => m.skill), injectedSkills: injected.map(i => i.skill), summaryOnly: summaryOnly.map(s => s.skill) };
parts.push(`<!-- codebrain:promptInjection: ${JSON.stringify(meta)} -->`);

process.stdout.write(JSON.stringify({ hookSpecificOutput: { additionalContext: parts.join("\n") } }));
process.exit(0);
