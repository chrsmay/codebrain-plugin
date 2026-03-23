import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileStore } from "../storage/file-store.js";
import type { WorkflowState } from "../storage/schema.js";

export function registerWorkflowTools(server: McpServer, store: FileStore) {
  server.tool(
    "codebrain_workflow_get_state",
    "Read the current workflow state (active plan, yolo run, or epic)",
    {
      workflow_id: z.string().optional().describe("Workflow ID. Defaults to 'active' (reads active/yolo-state.json)."),
    },
    async ({ workflow_id }) => {
      const id = workflow_id ?? "active";
      const path = id === "active" ? "active/yolo-state.json" : `epics/${id}/workflow-state.json`;

      try {
        const state = await store.readJson<WorkflowState>(path);
        return { content: [{ type: "text" as const, text: JSON.stringify(state) }] };
      } catch {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              workflow_id: id,
              type: "plan",
              phase: "none",
              completed_phases: [],
              pending_phases: [],
              current_task: null,
              metadata: {},
              updated_at: new Date().toISOString(),
            }),
          }],
        };
      }
    }
  );

  server.tool(
    "codebrain_workflow_set_state",
    "Update the workflow state for a plan, yolo run, or epic",
    {
      workflow_id: z.string().describe("Workflow ID ('active' for current plan/yolo, or epic slug)"),
      phase: z.string().describe("Current phase name"),
      current_task: z.string().nullable().optional().describe("Current task being worked on"),
      metadata: z.record(z.unknown()).optional().describe("Additional state metadata to merge"),
    },
    async ({ workflow_id, phase, current_task, metadata }) => {
      const path = workflow_id === "active" ? "active/yolo-state.json" : `epics/${workflow_id}/workflow-state.json`;

      let existing: WorkflowState;
      try {
        existing = await store.readJson<WorkflowState>(path);
      } catch {
        existing = {
          workflow_id,
          type: "plan",
          phase: "none",
          completed_phases: [],
          pending_phases: [],
          current_task: null,
          metadata: {},
          updated_at: new Date().toISOString(),
        };
      }

      // Move current phase to completed if advancing
      if (phase !== existing.phase && existing.phase !== "none") {
        existing.completed_phases.push(existing.phase);
        existing.pending_phases = existing.pending_phases.filter((p) => p !== phase);
      }

      existing.phase = phase;
      existing.current_task = current_task ?? existing.current_task;
      existing.metadata = { ...existing.metadata, ...metadata };
      existing.updated_at = new Date().toISOString();

      await store.writeJson(path, existing);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true }) }] };
    }
  );

  server.tool(
    "codebrain_workflow_list",
    "List all known workflows (active plan, epics, paused yolo runs)",
    {},
    async () => {
      const workflows: Array<{ id: string; type: string; status: string; created: string }> = [];

      // Check active workflow
      try {
        const active = await store.readJson<WorkflowState>("active/yolo-state.json");
        workflows.push({
          id: "active",
          type: active.type,
          status: active.phase,
          created: active.updated_at,
        });
      } catch {
        // No active workflow
      }

      // Check epics
      const epics = await store.list("epics", undefined);
      const epicDirs = new Set(epics.map((e) => e.path.split("/")[1]).filter(Boolean));

      for (const slug of epicDirs) {
        try {
          const state = await store.readJson<WorkflowState>(`epics/${slug}/workflow-state.json`);
          workflows.push({ id: slug, type: "epic", status: state.phase, created: state.updated_at });
        } catch {
          // Epic exists but no workflow state — just has artifacts
          workflows.push({ id: slug, type: "epic", status: "created", created: "" });
        }
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ workflows }) }] };
    }
  );
}
