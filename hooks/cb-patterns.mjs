/**
 * cb-patterns.mjs — Pattern matching and ranking for CodeBrain plugin
 * Converts glob patterns to regex, matches file paths and bash commands,
 * ranks skills by priority.
 */

/**
 * Convert a glob pattern to a regex source string.
 * Supports: *, **, ?, {a,b} alternation, character classes [abc]
 */
export function globToRegex(pattern) {
  let i = 0;
  let result = "";
  const len = pattern.length;

  while (i < len) {
    const ch = pattern[i];

    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // ** matches anything including /
        if (pattern[i + 2] === "/") {
          result += "(?:.*/)?";
          i += 3;
        } else {
          result += ".*";
          i += 2;
        }
      } else {
        // * matches anything except /
        result += "[^/]*";
        i++;
      }
    } else if (ch === "?") {
      result += "[^/]";
      i++;
    } else if (ch === "{") {
      // Brace expansion: {a,b,c}
      const close = pattern.indexOf("}", i);
      if (close === -1) {
        result += "\\{";
        i++;
      } else {
        const alternatives = pattern.slice(i + 1, close).split(",");
        result += "(?:" + alternatives.map(a => escapeRegexLiteral(a)).join("|") + ")";
        i = close + 1;
      }
    } else if (ch === "[") {
      const close = pattern.indexOf("]", i);
      if (close === -1) {
        result += "\\[";
        i++;
      } else {
        result += pattern.slice(i, close + 1);
        i = close + 1;
      }
    } else if (ch === ".") {
      result += "\\.";
      i++;
    } else if (ch === "/") {
      // Normalize path separators (Windows compat)
      result += "[/\\\\]";
      i++;
    } else {
      result += escapeRegexChar(ch);
      i++;
    }
  }

  return result;
}

function escapeRegexChar(ch) {
  return /[$()+^|]/.test(ch) ? "\\" + ch : ch;
}

function escapeRegexLiteral(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile skill patterns from a skill map.
 * Returns { [skillName]: { pathRegexes, bashRegexes } }
 */
export function compileSkillPatterns(skillMap) {
  const compiled = {};

  for (const [name, skill] of Object.entries(skillMap)) {
    const pathRegexes = (skill.pathPatterns || []).map(p => ({
      pattern: p,
      regex: new RegExp(globToRegex(p), "i")
    }));

    const bashRegexes = (skill.bashPatterns || []).map(p => {
      try {
        return { pattern: p, regex: new RegExp(p, "i") };
      } catch {
        return null;
      }
    }).filter(Boolean);

    compiled[name] = { pathRegexes, bashRegexes };
  }

  return compiled;
}

/**
 * Match a file path against compiled path patterns.
 * Tries: full path, basename, then progressively longer suffixes.
 * Returns { pattern, matchType } or null.
 */
export function matchPathWithReason(filePath, compiledPaths) {
  // Normalize separators
  const normalized = filePath.replace(/\\/g, "/");
  const basename = normalized.split("/").pop();

  for (const { pattern, regex } of compiledPaths) {
    // Full path match
    if (regex.test(normalized)) {
      return { pattern, matchType: "full" };
    }
    // Basename match
    if (regex.test(basename)) {
      return { pattern, matchType: "basename" };
    }
    // Suffix match: try progressively longer suffixes
    const parts = normalized.split("/");
    for (let i = parts.length - 2; i >= 0; i--) {
      const suffix = parts.slice(i).join("/");
      if (regex.test(suffix)) {
        return { pattern, matchType: "suffix" };
      }
    }
  }

  return null;
}

/**
 * Match a bash command against compiled bash patterns.
 * Returns { pattern, matchType: "bash" } or null.
 */
export function matchBashWithReason(command, compiledBash) {
  for (const { pattern, regex } of compiledBash) {
    if (regex.test(command)) {
      return { pattern, matchType: "bash" };
    }
  }
  return null;
}

/**
 * Rank skill entries by priority (descending), alphabetical tiebreak.
 * Each entry: { skill: string, priority: number, reason: object }
 */
export function rankEntries(entries) {
  return entries.slice().sort((a, b) => {
    const aPri = a.priority || 0;
    const bPri = b.priority || 0;
    if (bPri !== aPri) return bPri - aPri;
    return a.skill.localeCompare(b.skill);
  });
}

/**
 * Parse a CSV of seen skills into a Set.
 */
export function parseSeenSkills(csv) {
  if (!csv) return new Set();
  return new Set(csv.split(",").map(s => s.trim()).filter(Boolean));
}

/**
 * Merge multiple seen-skill sets.
 */
export function mergeSeenSkills(...sets) {
  const merged = new Set();
  for (const s of sets) {
    for (const skill of s) merged.add(skill);
  }
  return merged;
}
