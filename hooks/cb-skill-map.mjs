/**
 * cb-skill-map.mjs — YAML frontmatter parser and skill map builder
 * Parses SKILL.md files to extract metadata (priority, patterns, signals, chainTo).
 * Returns a skill map: { [slug]: SkillConfig }
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { safeReadFile } from "./cb-env.mjs";

/**
 * Extract frontmatter and body from a SKILL.md file.
 * Returns { frontmatter: string, body: string }
 */
export function extractFrontmatter(content) {
  if (!content.startsWith("---")) {
    return { frontmatter: "", body: content };
  }

  const secondDash = content.indexOf("---", 3);
  if (secondDash === -1) {
    return { frontmatter: "", body: content };
  }

  return {
    frontmatter: content.slice(3, secondDash).trim(),
    body: content.slice(secondDash + 3).trim(),
  };
}

/**
 * Minimal YAML parser for skill frontmatter.
 * Handles: scalars, lists (- item), nested objects (key:\n  subkey: val),
 * and inline lists of objects for chainTo.
 */
export function parseSimpleYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    // Detect indentation level
    const indent = line.length - line.trimStart().length;

    // Only process top-level (indent 0) and metadata-level (indent 2)
    if (indent === 0) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) { i++; continue; }

      const key = trimmed.slice(0, colonIdx).trim();
      const valueStr = trimmed.slice(colonIdx + 1).trim();

      if (valueStr === "" || valueStr === "|") {
        // Could be a nested object, list, or multiline
        const nested = collectNested(lines, i + 1, 2);
        if (nested.isObjectList) {
          result[key] = nested.objects;
        } else if (nested.isList) {
          result[key] = nested.items;
        } else if (Object.keys(nested.obj).length > 0) {
          result[key] = nested.obj;
        } else {
          result[key] = "";
        }
        i = nested.nextIndex;
      } else {
        result[key] = parseValue(valueStr);
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Collect nested content at a given indentation level.
 */
function collectNested(lines, startIndex, minIndent) {
  const items = [];
  const objects = [];
  const obj = {};
  let isList = false;
  let isObjectList = false;
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    if (!trimmed) { i++; continue; }

    const indent = line.length - line.trimStart().length;
    if (indent < minIndent) break;

    const content = trimmed.trimStart();

    if (content.startsWith("- ")) {
      isList = true;
      const itemValue = content.slice(2).trim();

      // Check if it's an object list item (- key: value)
      if (itemValue.includes(":") && !itemValue.startsWith('"') && !itemValue.startsWith("'")) {
        // Could be start of an object in a list
        const objItem = {};
        const colonIdx = itemValue.indexOf(":");
        const k = itemValue.slice(0, colonIdx).trim();
        const v = itemValue.slice(colonIdx + 1).trim();
        objItem[k] = parseValue(v);

        // Collect remaining keys at deeper indent
        i++;
        while (i < lines.length) {
          const subLine = lines[i];
          const subTrimmed = subLine.trimEnd();
          if (!subTrimmed) { i++; continue; }
          const subIndent = subLine.length - subLine.trimStart().length;
          if (subIndent <= indent) break;
          const subContent = subTrimmed.trimStart();
          const subColon = subContent.indexOf(":");
          if (subColon !== -1) {
            const sk = subContent.slice(0, subColon).trim();
            const sv = subContent.slice(subColon + 1).trim();
            objItem[sk] = parseValue(sv);
          }
          i++;
        }

        if (Object.keys(objItem).length > 1) {
          isObjectList = true;
          objects.push(objItem);
        } else {
          items.push(parseValue(itemValue));
        }
        continue;
      }

      // Check if it's a nested list: - [a, b, c]
      if (itemValue.startsWith("[") && itemValue.endsWith("]")) {
        const inner = itemValue.slice(1, -1).split(",").map(s => parseValue(s.trim()));
        items.push(inner);
      } else {
        items.push(parseValue(itemValue));
      }
      i++;
    } else if (content.includes(":")) {
      // Sub-object key
      const colonIdx = content.indexOf(":");
      const key = content.slice(0, colonIdx).trim();
      const val = content.slice(colonIdx + 1).trim();

      if (val === "" || val === "|") {
        // Deeper nested
        const deeper = collectNested(lines, i + 1, indent + 2);
        if (deeper.isObjectList) {
          obj[key] = deeper.objects;
        } else if (deeper.isList) {
          obj[key] = deeper.items;
        } else if (Object.keys(deeper.obj).length > 0) {
          obj[key] = deeper.obj;
        } else {
          obj[key] = "";
        }
        i = deeper.nextIndex;
      } else {
        obj[key] = parseValue(val);
        i++;
      }
    } else {
      i++;
    }
  }

  return { items, objects, obj, isList, isObjectList, nextIndex: i };
}

/** Parse a scalar YAML value */
function parseValue(str) {
  if (!str) return "";
  // Remove quotes and unescape
  if (str.startsWith('"') && str.endsWith('"')) {
    // YAML double-quoted: unescape \\, \n, \t, etc.
    return str.slice(1, -1).replace(/\\(.)/g, (_, ch) => {
      if (ch === "n") return "\n";
      if (ch === "t") return "\t";
      if (ch === "\\") return "\\";
      return ch; // \b → b, \s → s, etc. — pass through for regex patterns
    });
  }
  if (str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1);
  }
  // Booleans
  if (str === "true") return true;
  if (str === "false") return false;
  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str);
  // Arrays: [a, b, c]
  if (str.startsWith("[") && str.endsWith("]")) {
    return str.slice(1, -1).split(",").map(s => parseValue(s.trim()));
  }
  return str;
}

/**
 * Build a skill map from the skills directory.
 * Returns { [slug]: SkillConfig }
 */
export function buildSkillMap(skillsDir) {
  const map = {};

  let entries;
  try {
    entries = readdirSync(skillsDir);
  } catch {
    return map;
  }

  for (const entry of entries) {
    const skillDir = join(skillsDir, entry);
    try {
      if (!statSync(skillDir).isDirectory()) continue;
    } catch {
      continue;
    }

    const skillFile = join(skillDir, "SKILL.md");
    const content = safeReadFile(skillFile);
    if (!content) continue;

    const { frontmatter, body } = extractFrontmatter(content);
    if (!frontmatter) {
      // Skills without frontmatter get minimal config
      map[entry] = {
        name: entry,
        description: "",
        priority: 0,
        pathPatterns: [],
        bashPatterns: [],
        promptSignals: null,
        chainTo: [],
        body,
        filePath: skillFile,
      };
      continue;
    }

    const parsed = parseSimpleYaml(frontmatter);
    const metadata = parsed.metadata || {};

    map[entry] = {
      name: parsed.name || entry,
      description: parsed.description || "",
      priority: metadata.priority || 0,
      pathPatterns: metadata.pathPatterns || [],
      bashPatterns: metadata.bashPatterns || [],
      promptSignals: metadata.promptSignals || null,
      chainTo: metadata.chainTo || [],
      body,
      filePath: skillFile,
    };
  }

  return map;
}
