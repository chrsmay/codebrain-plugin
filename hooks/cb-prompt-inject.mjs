#!/usr/bin/env node
/**
 * cb-prompt-inject.mjs — UserPromptSubmit prompt signal injection
 * Fires when the user submits a prompt. Scores the prompt against
 * all skills' promptSignals, selects top matches, injects as context.
 */

import { join } from "node:path";
import {
  pluginRoot, readStdinJson, writeHookOutput, safeReadFile,
  tryClaimSkill, listClaimedSkills,
} from "./cb-env.mjs";
import { buildSkillMap } from "./cb-skill-map.mjs";
import { matchPromptAgainstSkills } from "./cb-prompt-patterns.mjs";

// ── Constants ────────────────────────────────────────────
const MAX_PROMPT_SKILLS = 2;
const PROMPT_BUDGET_BYTES = 8000;
const SUMMARY_TEMPLATE = (skill) =>
  `You must run the Skill(codebrain:${skill}) tool.`;

// ── Main ─────────────────────────────────────────────────
async function main() {
  const input = await readStdinJson();
  const userPrompt = input.user_prompt || input.prompt || "";
  const sessionId = input.session_id || "default";

  if (!userPrompt || userPrompt.length < 5) {
    return writeHookOutput(null);
  }

  // Load skill map
  const root = pluginRoot();
  const skillMap = buildSkillMap(join(root, "skills"));

  // Match prompt against all skills
  const matches = matchPromptAgainstSkills(userPrompt, skillMap);

  if (matches.length === 0) return writeHookOutput(null);

  // Dedup against already-seen skills
  const seenSkills = new Set(listClaimedSkills(sessionId));
  const fresh = matches.filter(m => !seenSkills.has(m.skill));

  if (fresh.length === 0) return writeHookOutput(null);

  // Select top N matches within budget
  const injected = [];
  const summaryOnly = [];
  let usedBytes = 0;

  for (const match of fresh.slice(0, MAX_PROMPT_SKILLS + 2)) {
    if (injected.length >= MAX_PROMPT_SKILLS) break;

    const skill = skillMap[match.skill];
    if (!skill) continue;

    const content = buildSkillContent(match.skill, skill);
    const byteLen = Buffer.byteLength(content, "utf-8");

    if (injected.length > 0 && usedBytes + byteLen > PROMPT_BUDGET_BYTES) {
      // Try summary fallback
      const summary = SUMMARY_TEMPLATE(match.skill);
      const summaryBytes = Buffer.byteLength(summary, "utf-8");
      if (usedBytes + summaryBytes <= PROMPT_BUDGET_BYTES) {
        summaryOnly.push({ skill: match.skill, summary });
        usedBytes += summaryBytes;
      }
      continue;
    }

    // Claim in dedup
    if (!tryClaimSkill(sessionId, match.skill)) continue;

    injected.push({
      skill: match.skill,
      content,
      score: match.score,
      matchedPhrases: match.matchedPhrases,
    });
    usedBytes += byteLen;
  }

  if (injected.length === 0 && summaryOnly.length === 0) {
    return writeHookOutput(null);
  }

  // ── Build output ───────────────────────────────────────
  const parts = [];

  parts.push("[codebrain] Skills auto-suggested based on prompt analysis:");
  for (const i of injected) {
    parts.push(`  - "${i.skill}" matched: prompt signal (score ${i.score}, phrases: ${i.matchedPhrases.join(", ")})`);
  }

  parts.push("");

  // Full skill content
  for (const i of injected) {
    parts.push(`--- codebrain:${i.skill} ---`);
    parts.push(i.content);
    parts.push(`--- end codebrain:${i.skill} ---`);
    parts.push("");
  }

  // Summary references
  for (const s of summaryOnly) {
    parts.push(s.summary);
  }

  // Metadata
  const meta = {
    version: 1,
    hookEvent: "UserPromptSubmit",
    matchedSkills: matches.map(m => m.skill),
    injectedSkills: injected.map(i => i.skill),
    summaryOnly: summaryOnly.map(s => s.skill),
  };
  parts.push(`<!-- codebrain:promptInjection: ${JSON.stringify(meta)} -->`);

  writeHookOutput(parts.join("\n"));
}

function buildSkillContent(name, skill) {
  const header = `# codebrain:${name}\n\nInvoke with: /codebrain:${name}\n\n`;
  return header + (skill.body || "");
}

// ── Run ──────────────────────────────────────────────────
main().catch(() => writeHookOutput(null));
