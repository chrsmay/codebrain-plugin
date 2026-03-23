import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileStore } from "../storage/file-store.js";

export function registerArtifactTools(server: McpServer, store: FileStore) {
  server.tool(
    "codebrain_artifact_read",
    "Read an artifact file from .codebrain/",
    { path: z.string().describe("Relative path within .codebrain/ (e.g. epics/auth/specs/prd.md)") },
    async ({ path }) => {
      try {
        const { content, lastModified, size } = await store.read(path);
        return { content: [{ type: "text" as const, text: JSON.stringify({ content, metadata: { path, lastModified, size } }) }] };
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `File not found: ${path}` }) }], isError: true };
      }
    }
  );

  server.tool(
    "codebrain_artifact_write",
    "Write an artifact file to .codebrain/",
    {
      path: z.string().describe("Relative path within .codebrain/"),
      content: z.string().describe("Full file content to write"),
    },
    async ({ path, content }) => {
      await store.write(path, content);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, path }) }] };
    }
  );

  server.tool(
    "codebrain_artifact_list",
    "List artifact files in a .codebrain/ subdirectory",
    {
      directory: z.string().describe("Directory relative to .codebrain/ (e.g. epics/auth/tickets)"),
      pattern: z.string().optional().describe("Optional glob pattern to filter files (e.g. *.md)"),
    },
    async ({ directory, pattern }) => {
      const files = await store.list(directory, pattern);
      return { content: [{ type: "text" as const, text: JSON.stringify({ files }) }] };
    }
  );

  server.tool(
    "codebrain_artifact_delete",
    "Delete an artifact file from .codebrain/",
    { path: z.string().describe("Relative path within .codebrain/") },
    async ({ path }) => {
      try {
        await store.delete(path);
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: true }) }] };
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `File not found: ${path}` }) }], isError: true };
      }
    }
  );
}
