/**
 * cb-prompt-patterns.mjs — Prompt signal scoring for CodeBrain plugin
 * Scores user prompts against skill promptSignals configurations.
 * Scoring: phrases +6, allOf +4, anyOf +1 (cap 2), noneOf → -Infinity
 * Threshold: 6 (one phrase match or allOf + anyOf combo)
 */

const PHRASE_SCORE = 6;
const ALLOF_SCORE = 4;
const ANYOF_SCORE = 1;
const ANYOF_CAP = 2;
const DEFAULT_THRESHOLD = 6;

// Common contractions to expand
const CONTRACTIONS = {
  "it's": "it is",
  "isn't": "is not",
  "doesn't": "does not",
  "don't": "do not",
  "can't": "cannot",
  "won't": "will not",
  "shouldn't": "should not",
  "couldn't": "could not",
  "wouldn't": "would not",
  "what's": "what is",
  "that's": "that is",
  "there's": "there is",
  "i'm": "i am",
  "i've": "i have",
  "i'll": "i will",
  "we're": "we are",
  "they're": "they are",
  "you're": "you are",
  "we've": "we have",
  "hasn't": "has not",
  "haven't": "have not",
  "wasn't": "was not",
  "weren't": "were not",
};

/**
 * Normalize prompt text for matching.
 * Lowercases, expands contractions, collapses whitespace.
 */
export function normalizePromptText(text) {
  if (!text) return "";
  let normalized = text.toLowerCase().trim();

  // Expand contractions
  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegex(contraction)}\\b`, "g"), expansion);
  }

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ");

  return normalized;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile prompt signals from a skill's promptSignals config.
 * Returns a compiled object ready for scoring.
 */
export function compilePromptSignals(signals) {
  if (!signals) return null;

  return {
    phrases: (signals.phrases || []).map(p => normalizePromptText(p)).filter(Boolean),
    allOf: (signals.allOf || []).map(group =>
      group.map(term => normalizePromptText(term)).filter(Boolean)
    ).filter(g => g.length > 0),
    anyOf: (signals.anyOf || []).map(term => normalizePromptText(term)).filter(Boolean),
    noneOf: (signals.noneOf || []).map(term => normalizePromptText(term)).filter(Boolean),
    minScore: signals.minScore || DEFAULT_THRESHOLD,
  };
}

/**
 * Score a normalized prompt against compiled signals.
 * Returns { score: number, matchedPhrases: string[] }
 */
export function scorePrompt(normalizedPrompt, compiled) {
  if (!compiled) return { score: 0, matchedPhrases: [] };

  const matchedPhrases = [];
  let score = 0;

  // Check noneOf first — any match rejects the skill entirely
  for (const term of compiled.noneOf) {
    if (normalizedPrompt.includes(term)) {
      return { score: -Infinity, matchedPhrases: [] };
    }
  }

  // Phrases: +6 each
  for (const phrase of compiled.phrases) {
    if (normalizedPrompt.includes(phrase)) {
      score += PHRASE_SCORE;
      matchedPhrases.push(phrase);
    }
  }

  // allOf: +4 per group where ALL terms present
  for (const group of compiled.allOf) {
    if (group.every(term => normalizedPrompt.includes(term))) {
      score += ALLOF_SCORE;
      matchedPhrases.push(`allOf:[${group.join(",")}]`);
    }
  }

  // anyOf: +1 each, capped at ANYOF_CAP
  let anyOfCount = 0;
  for (const term of compiled.anyOf) {
    if (anyOfCount >= ANYOF_CAP) break;
    if (normalizedPrompt.includes(term)) {
      score += ANYOF_SCORE;
      anyOfCount++;
    }
  }

  return { score, matchedPhrases };
}

/**
 * Match a prompt against all skills' promptSignals.
 * Returns sorted array of { skill, score, matchedPhrases } above threshold.
 */
export function matchPromptAgainstSkills(prompt, skillMap) {
  const normalizedPrompt = normalizePromptText(prompt);
  const results = [];

  for (const [name, skill] of Object.entries(skillMap)) {
    if (!skill.promptSignals) continue;

    const compiled = compilePromptSignals(skill.promptSignals);
    const { score, matchedPhrases } = scorePrompt(normalizedPrompt, compiled);

    if (score >= (compiled.minScore || DEFAULT_THRESHOLD)) {
      results.push({
        skill: name,
        score,
        priority: skill.priority || 0,
        matchedPhrases,
      });
    }
  }

  // Sort by score descending, then priority descending
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.priority - a.priority;
  });
}
