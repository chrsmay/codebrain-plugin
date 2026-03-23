import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileStore } from "../storage/file-store.js";

const MEMORY_FILES = ["constitution", "continuity", "architecture", "patterns", "known-issues", "decisions"] as const;

export function registerMemoryTools(server: McpServer, store: FileStore) {
  server.tool(
    "codebrain_memory_read",
    "Read a memory file from .codebrain/memory/. Use file='all' to read everything.",
    {
      file: z.string().describe("One of: continuity, architecture, patterns, known-issues, decisions, or 'all'"),
    },
    async ({ file }) => {
      if (file === "all") {
        const files: Record<string, string> = {};
        for (const f of MEMORY_FILES) {
          try {
            const { content } = await store.read(`memory/${f}.md`);
            files[f] = content;
          } catch {
            files[f] = "";
          }
        }
        return { content: [{ type: "text" as const, text: JSON.stringify({ files }) }] };
      }

      try {
        const { content } = await store.read(`memory/${file}.md`);
        return { content: [{ type: "text" as const, text: JSON.stringify({ content }) }] };
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ content: "" }) }] };
      }
    }
  );

  server.tool(
    "codebrain_memory_update",
    "Write or update a memory file in .codebrain/memory/",
    {
      file: z.string().describe("Memory file name (without .md extension): continuity, architecture, patterns, known-issues, or decisions"),
      content: z.string().describe("Complete new content for the memory file"),
    },
    async ({ file, content }) => {
      await store.write(`memory/${file}.md`, content);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, file: `memory/${file}.md` }) }] };
    }
  );

  server.tool(
    "codebrain_memory_reset",
    "Clear all memory files in .codebrain/memory/. Requires confirm=true.",
    {
      confirm: z.boolean().describe("Must be true to proceed"),
    },
    async ({ confirm }) => {
      if (!confirm) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "confirm must be true" }) }], isError: true };
      }

      const cleared: string[] = [];
      for (const f of MEMORY_FILES) {
        try {
          await store.delete(`memory/${f}.md`);
          cleared.push(f);
        } catch {
          // File didn't exist, skip
        }
      }

      // Recreate empty files
      for (const f of MEMORY_FILES) {
        await store.write(`memory/${f}.md`, `# ${f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, " ")}\n\n_No entries yet._\n`);
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, files_cleared: cleared }) }] };
    }
  );
}
