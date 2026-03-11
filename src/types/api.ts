// Agent types
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  temporal: { namespace: string; taskQueue: string };
  model: { path: string; size: string };
  status: "draft" | "published" | "archived" | "ready";
  version: number;
  autonomyLevel: string;
  tools?: { enabled: string[] };
  routing?: { keywords: string[]; examples?: string[] };
  routingStrategy?: string;
  permissions?: AgentPermissions;
  maxIterations?: number;
  maxTokensPerRun?: number;
  timeoutSeconds?: number;
  deletedAt?: string;
}

export interface AgentPermissions {
  canCreateEntities: boolean;
  canUpdateEntities: boolean;
  canDeleteEntities: boolean;
  canRunWorkflows: boolean;
}

export interface AgentConfiguration {
  id: string;
  name: string;
  description: string;
  temporal: { namespace: string; taskQueue: string; cluster?: string };
  model: { path: string; size: string };
  tools: { enabled: string[] };
  routing?: { keywords: string[]; examples?: string[] };
  routingStrategy?: string;
  autonomyLevel?: string;
  permissions?: AgentPermissions;
  maxIterations?: number;
  maxTokensPerRun?: number;
  timeoutSeconds?: number;
  status?: string;
  version?: number;
}

// Execution types
export interface ExecuteRequest {
  query: string;
  agentId?: string;
  modelPath?: string;
  mode?: "standard" | "agentic";
  maxIterations?: number;
  maxTokensPerRun?: number;
}

export interface ExecuteResponse {
  response: string;
  executionPath: string;
  complexityScore: number;
  executionTime: number;
  tokensUsed: number;
  workflowId: string;
  runId: string;
  selectedAgent: string;
  autoRouted: boolean;
  selectedModel?: string;
  selectedProvider?: string;
  estimatedCost?: number;
  subtasks?: SubtaskResult[];
  // Agentic fields
  steps?: AgentRunStep[];
  iterationCount?: number;
  totalTokens?: number;
  stopReason?: string;
}

export interface SubtaskResult {
  subtask: string;
  response: string;
  tokensUsed: number;
}

// Run types
export interface AgentRun {
  id: string;
  agentId: string;
  workflowId: string;
  runId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  query: string;
  response: string;
  executionPath: string;
  complexityScore: number;
  tokensUsed: number;
  estimatedCost: number;
  iterationCount?: number;
  stopReason?: string;
  selectedModel?: string;
  autoRouted: boolean;
  errorDetails?: string;
  startedAt: string;
  completedAt?: string;
  executionTimeMs: number;
  steps?: AgentRunStep[];
}

export interface AgentRunStep {
  id: string;
  runId: string;
  stepNumber: number;
  type: "llm_call" | "tool_execution" | "approval_wait";
  input: string;
  output: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

// Tool types
export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  type: "builtin" | "mcp" | "custom";
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  timeout?: number;
  maxRetries?: number;
  requiresApproval: boolean;
  enabled: boolean;
  mcpServerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ToolInvocationResult {
  toolName: string;
  output: string;
  executionTimeMs: number;
  success: boolean;
  error?: string;
}

// Template types
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: string;
  autonomyLevel: string;
  systemPrompt?: string;
  tools: string[];
  permissions?: AgentPermissions;
  model: { path: string; size: string };
  maxIterations: number;
  routing?: { keywords: string[] };
  tags?: string[];
}

// Approval types
export interface ApprovalRequest {
  id: string;
  runId: string;
  agentId: string;
  workflowId: string;
  toolName: string;
  toolArgs?: Record<string, unknown>;
  reason: string;
  status: "pending" | "approved" | "rejected" | "expired";
  decision?: string;
  decidedBy?: string;
  expiresAt?: string;
  createdAt: string;
  decidedAt?: string;
}

// Stats types
export interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  draftAgents: number;
  totalRuns: number;
  runsLast30Days: number;
  tokensLast30Days: number;
  estimatedCostLast30Days: number;
  avgExecutionTimeMs: number;
  successRate: number;
}

export interface AgentUsage {
  agentId: string;
  runs: number;
  tokens: number;
  cost: number;
  avgExecutionTimeMs: number;
  topTools: { name: string; invocations: number }[];
  timeline: { date: string; runs: number; tokens: number }[];
}

// MCP types
export interface MCPServerInfo {
  serverId: string;
  name: string;
  status: "stopped" | "starting" | "running" | "error" | "restarting";
  transport: string;
  restartCount: number;
  tools: { name: string; description: string }[];
  workflowId?: string;
}

// Version types
export interface AgentVersion {
  id: string;
  agentId: string;
  version: number;
  config: AgentConfiguration;
  changedBy?: string;
  changeSummary?: string;
  createdAt: string;
}
