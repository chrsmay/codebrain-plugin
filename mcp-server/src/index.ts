#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FileStore, findCodebrainRoot } from "./storage/file-store.js";
import { registerArtifactTools } from "./tools/artifact-tools.js";
import { registerMemoryTools } from "./tools/memory-tools.js";
import { registerWorkflowTools } from "./tools/workflow-tools.js";
import { registerProjectTools } from "./tools/project-tools.js";

const server = new McpServer({
  name: "codebrain",
  version: "1.0.0",
});

const root = findCodebrainRoot();
const store = new FileStore(root);

// Register all 14 tools
registerArtifactTools(server, store);
registerMemoryTools(server, store);
registerWorkflowTools(server, store);
registerProjectTools(server, store);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
