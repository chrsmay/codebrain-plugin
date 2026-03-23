#!/usr/bin/env node
/**
 * cb-session-cleanup.mjs — SessionEnd hook for CodeBrain
 * Removes all session temp files (dedup claims, etc.)
 */

import { readStdinJson, removeSessionArtifacts } from "./cb-env.mjs";

async function main() {
  const input = await readStdinJson();
  const sessionId = input.session_id || "default";
  removeSessionArtifacts(sessionId);
  process.stdout.write("{}");
}

main().catch(() => process.stdout.write("{}"));
