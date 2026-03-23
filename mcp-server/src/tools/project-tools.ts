import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileStore } from "../storage/file-store.js";
import type { CodebrainConfig, EpicStatus, TicketSummary } from "../storage/schema.js";
import { DEFAULT_CONFIG } from "../storage/schema.js";

export function registerProjectTools(server: McpServer, store: FileStore) {
  server.tool(
    "codebrain_config_read",
    "Read the .codebrain/config.json project settings",
    {},
    async () => {
      try {
        const config = await store.readJson<CodebrainConfig>("config.json");
        return { content: [{ type: "text" as const, text: JSON.stringify({ config }) }] };
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ config: DEFAULT_CONFIG }) }] };
      }
    }
  );

  server.tool(
    "codebrain_config_write",
    "Update .codebrain/config.json (deep-merges with existing config)",
    {
      config: z.record(z.unknown()).describe("Config fields to merge (partial update supported)"),
    },
    async ({ config }) => {
      let existing: CodebrainConfig;
      try {
        existing = await store.readJson<CodebrainConfig>("config.json");
      } catch {
        existing = { ...DEFAULT_CONFIG };
      }

      const merged = deepMerge(existing as unknown as Record<string, unknown>, config);
      await store.writeJson("config.json", merged);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true }) }] };
    }
  );

  server.tool(
    "codebrain_scaffold",
    "Create the .codebrain/ directory structure with defaults. Safe to run multiple times.",
    {
      force: z.boolean().optional().describe("Force re-creation even if .codebrain/ exists"),
    },
    async ({ force }) => {
      const created: string[] = [];

      const dirs = [
        "memory",
        "active",
        "epics",
        "reviews",
      ];

      for (const dir of dirs) {
        if (force || !(await store.exists(dir))) {
          await store.write(`${dir}/.gitkeep`, "");
          created.push(dir);
        }
      }

      // Write default config if missing
      if (force || !(await store.exists("config.json"))) {
        await store.writeJson("config.json", DEFAULT_CONFIG);
        created.push("config.json");
      }

      // Write empty memory files if missing
      const memoryFiles = ["continuity", "architecture", "patterns", "known-issues", "decisions"];
      for (const f of memoryFiles) {
        const path = `memory/${f}.md`;
        if (force || !(await store.exists(path))) {
          const title = f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, " ");
          await store.write(path, `# ${title}\n\n_No entries yet._\n`);
          created.push(path);
        }
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, created }) }] };
    }
  );

  server.tool(
    "codebrain_epic_status",
    "Get aggregated status for an epic (specs, tickets, progress, decisions)",
    {
      epic_slug: z.string().describe("Epic directory name (e.g. 'auth-system')"),
    },
    async ({ epic_slug }) => {
      const epicDir = `epics/${epic_slug}`;

      // Read epic overview
      let title = epic_slug;
      let epicStatus = "active";
      try {
        const { content } = await store.read(`${epicDir}/epic.md`);
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) title = titleMatch[1];
        const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/i);
        if (statusMatch) epicStatus = statusMatch[1];
      } catch {
        // Epic overview missing
      }

      // List specs
      const specFiles = await store.list(`${epicDir}/specs`, "*.md");
      const specs = specFiles.map((f) => f.path);

      // List and parse tickets
      const ticketFiles = await store.list(`${epicDir}/tickets`, "*.md");
      const tickets: TicketSummary[] = [];
      for (const tf of ticketFiles) {
        try {
          const { content } = await store.read(tf.path);
          const id = tf.path.split("/").pop()?.replace(".md", "") ?? tf.path;
          const titleMatch = content.match(/^#\s+(?:Ticket \d+:\s*)?(.+)/m);
          const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/i);
          const depsMatch = content.match(/\*\*Depends On:\*\*\s*(.+)/i);
          const orderMatch = content.match(/\*\*Execution Order:\*\*\s*(\d+)/i);

          tickets.push({
            id,
            title: titleMatch?.[1] ?? id,
            status: statusMatch?.[1] ?? "todo",
            depends_on: depsMatch?.[1] === "none" ? [] : (depsMatch?.[1]?.split(",").map((s) => s.trim()) ?? []),
            execution_order: orderMatch ? parseInt(orderMatch[1], 10) : 999,
          });
        } catch {
          // Skip unparseable tickets
        }
      }
      tickets.sort((a, b) => a.execution_order - b.execution_order);

      // List decisions
      const decisionFiles = await store.list(`${epicDir}`, "decisions*");
      const decisions = decisionFiles.map((f) => f.path);

      const done = tickets.filter((t) => t.status === "done").length;

      const result: EpicStatus = {
        title,
        status: epicStatus,
        specs,
        tickets,
        decisions,
        progress: { done, total: tickets.length },
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
