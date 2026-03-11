import type {
  AgentInfo,
  AgentConfiguration,
  ExecuteRequest,
  ExecuteResponse,
  AgentRun,
  AgentRunStep,
  ToolDefinition,
  ToolInvocationResult,
  AgentTemplate,
  ApprovalRequest,
  AgentStats,
  AgentUsage,
  MCPServerInfo,
  AgentVersion,
} from "@/types/api";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Agents
export async function listAgents(): Promise<AgentInfo[]> {
  const data = await request<{ agents: AgentInfo[] }>("/agents");
  return data.agents ?? [];
}

export async function getAgent(id: string): Promise<AgentInfo> {
  return request<AgentInfo>(`/agents/${id}`);
}

export async function createAgent(agent: Partial<AgentConfiguration>): Promise<AgentInfo> {
  return request<AgentInfo>("/agents", {
    method: "POST",
    body: JSON.stringify(agent),
  });
}

export async function updateAgent(id: string, agent: Partial<AgentConfiguration>): Promise<AgentInfo> {
  return request<AgentInfo>(`/agents/${id}`, {
    method: "PUT",
    body: JSON.stringify(agent),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  return request<void>(`/agents/${id}`, { method: "DELETE" });
}

export async function publishAgent(id: string): Promise<AgentInfo> {
  return request<AgentInfo>(`/agents/${id}/publish`, { method: "POST" });
}

export async function listAgentVersions(id: string): Promise<AgentVersion[]> {
  const data = await request<{ versions: AgentVersion[] }>(`/agents/${id}/versions`);
  return data.versions ?? [];
}

// Execution
export async function executeAgent(req: ExecuteRequest): Promise<ExecuteResponse> {
  return request<ExecuteResponse>("/agent/execute", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// Runs
export async function listRuns(agentId: string): Promise<AgentRun[]> {
  const data = await request<{ runs: AgentRun[] }>(`/agents/${agentId}/runs`);
  return data.runs ?? [];
}

export async function getRun(agentId: string, runId: string): Promise<AgentRun & { steps: AgentRunStep[] }> {
  return request(`/agents/${agentId}/runs/${runId}`);
}

// Stats
export async function getStats(): Promise<AgentStats> {
  return request<AgentStats>("/agents/stats");
}

export async function getAgentUsage(agentId: string, period?: string): Promise<AgentUsage> {
  const q = period ? `?period=${period}` : "";
  return request<AgentUsage>(`/agents/${agentId}/usage${q}`);
}

// Tools
export async function listTools(): Promise<ToolDefinition[]> {
  const data = await request<{ tools: ToolDefinition[] }>("/tools");
  return data.tools ?? [];
}

export async function getTool(name: string): Promise<ToolDefinition> {
  return request<ToolDefinition>(`/tools/${name}`);
}

export async function createTool(tool: Partial<ToolDefinition>): Promise<ToolDefinition> {
  return request<ToolDefinition>("/tools", {
    method: "POST",
    body: JSON.stringify(tool),
  });
}

export async function updateTool(name: string, tool: Partial<ToolDefinition>): Promise<ToolDefinition> {
  return request<ToolDefinition>(`/tools/${name}`, {
    method: "PUT",
    body: JSON.stringify(tool),
  });
}

export async function deleteTool(name: string): Promise<void> {
  return request<void>(`/tools/${name}`, { method: "DELETE" });
}

export async function invokeTool(name: string, args: Record<string, unknown>): Promise<ToolInvocationResult> {
  return request<ToolInvocationResult>(`/tools/${name}/invoke`, {
    method: "POST",
    body: JSON.stringify({ arguments: args }),
  });
}

export async function listAgentTools(agentId: string): Promise<ToolDefinition[]> {
  const data = await request<{ tools: ToolDefinition[] }>(`/agents/${agentId}/tools`);
  return data.tools ?? [];
}

export async function enableAgentTool(agentId: string, toolName: string): Promise<void> {
  return request<void>(`/agents/${agentId}/tools/${toolName}`, { method: "POST" });
}

export async function disableAgentTool(agentId: string, toolName: string): Promise<void> {
  return request<void>(`/agents/${agentId}/tools/${toolName}`, { method: "DELETE" });
}

// Templates
export async function listTemplates(category?: string): Promise<AgentTemplate[]> {
  const q = category ? `?category=${category}` : "";
  const data = await request<{ templates: AgentTemplate[] }>(`/agents/templates${q}`);
  return data.templates ?? [];
}

export async function getTemplate(id: string): Promise<AgentTemplate> {
  return request<AgentTemplate>(`/agents/templates/${id}`);
}

export async function createFromTemplate(templateId: string, overrides?: Record<string, unknown>): Promise<AgentInfo> {
  return request<AgentInfo>("/agents/from-template", {
    method: "POST",
    body: JSON.stringify({ templateId, ...overrides }),
  });
}

// Approvals
export async function listPendingApprovals(): Promise<ApprovalRequest[]> {
  const data = await request<{ approvals: ApprovalRequest[] }>("/approvals/pending");
  return data.approvals ?? [];
}

export async function approveRequest(id: string, decidedBy?: string): Promise<ApprovalRequest> {
  return request<ApprovalRequest>(`/approvals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ decidedBy: decidedBy || "playground-user" }),
  });
}

export async function rejectRequest(id: string, reason?: string): Promise<ApprovalRequest> {
  return request<ApprovalRequest>(`/approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "Rejected from playground", decidedBy: "playground-user" }),
  });
}

// MCP
export async function listMCPServers(): Promise<MCPServerInfo[]> {
  const data = await request<{ servers: MCPServerInfo[] }>("/mcp/servers");
  return data.servers ?? [];
}

// Health
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch("/health");
    return res.ok;
  } catch {
    return false;
  }
}
