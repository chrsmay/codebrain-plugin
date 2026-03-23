#!/usr/bin/env node
/**
 * cb-session-cleanup.mjs — SessionEnd hook for CodeBrain
 * Removes all session temp files (dedup claims, etc.)
 * Must be fast and synchronous — SessionEnd hooks get cancelled if slow.
 */

import { readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

try {
  // Clean up ALL codebrain temp files (no need for session_id from stdin)
  const tmp = tmpdir();
  const files = readdirSync(tmp);
  for (const f of files) {
    if (f.startsWith("codebrain-")) {
      try {
        rmSync(join(tmp, f), { recursive: true, force: true });
      } catch { /* ignore individual file errors */ }
    }
  }
} catch { /* ignore */ }

process.stdout.write("{}");
