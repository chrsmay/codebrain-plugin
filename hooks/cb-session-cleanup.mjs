#!/usr/bin/env node
/**
 * cb-session-cleanup.mjs — SessionEnd hook for CodeBrain
 * Removes session-scoped temp files (dedup claims, etc.)
 * Must be fast and synchronous — SessionEnd hooks get cancelled if slow.
 */

import { readFileSync } from "node:fs";
import { removeSessionArtifacts } from "./cb-env.mjs";

let sessionId = "default";
try {
  const raw = readFileSync(0, { encoding: "utf-8" });
  if (raw) { sessionId = JSON.parse(raw).session_id || "default"; }
} catch { /* no stdin or invalid JSON */ }

removeSessionArtifacts(sessionId);
process.stdout.write("{}");
