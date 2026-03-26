/** All TypeScript types for CodeBrain storage. */

export interface CodebrainConfig {
  version: string;
  project: {
    name: string;
    conventions_file: string | null;
    build_command: string | null;
    test_command: string | null;
    lint_command: string | null;
  };
  yolo: {
    auto_fix_minor: boolean;
    auto_fix_major: boolean;
    max_fix_attempts: number;
  };
}

export interface ArtifactMetadata {
  path: string;
  lastModified: string;
  size: number;
}

export interface ArtifactListEntry extends ArtifactMetadata {
  type: string; // inferred from path: spec, ticket, review, epic, decision, etc.
}

export interface WorkflowState {
  workflow_id: string;
  type: "plan" | "epic" | "yolo";
  phase: string;
  completed_phases: string[];
  pending_phases: string[];
  current_task: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface EpicStatus {
  title: string;
  status: string;
  specs: string[];
  tickets: TicketSummary[];
  decisions: string[];
  progress: { done: number; total: number };
}

export interface TicketSummary {
  id: string;
  title: string;
  status: string;
  depends_on: string[];
  execution_order: number;
}

export const DEFAULT_CONFIG: CodebrainConfig = {
  version: "1.0.0",
  project: {
    name: "auto-detected",
    conventions_file: null,
    build_command: null,
    test_command: null,
    lint_command: null,
  },
  yolo: {
    auto_fix_minor: true,
    auto_fix_major: false,
    max_fix_attempts: 2,
  },
};
