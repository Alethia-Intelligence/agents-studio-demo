"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Server,
  Wrench,
  Plus,
  X,
  Pencil,
  Trash2,
  Play,
  Square,
  Loader2,
  Terminal,
  Globe,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listMCPConfigs,
  createMCPConfig,
  updateMCPConfig,
  deleteMCPConfig,
  listMCPServers,
  startMCPServer,
  stopMCPServer,
  restartMCPServer,
  listMCPServerTools,
  invokeMCPTool,
} from "@/lib/api-client";
import type { MCPServerConfig, MCPServerInfo } from "@/types/api";

// --- Status styling ---

const STATUS_DOT: Record<MCPServerInfo["status"], string> = {
  running: "bg-success",
  stopped: "bg-muted-foreground",
  starting: "bg-warning",
  error: "bg-destructive",
  restarting: "bg-ale-blue",
};

const STATUS_LABEL_COLOR: Record<MCPServerInfo["status"], string> = {
  running: "text-success",
  stopped: "text-muted-foreground",
  starting: "text-warning",
  error: "text-destructive",
  restarting: "text-ale-blue",
};

// --- Form state ---

interface MCPFormState {
  id: string;
  name: string;
  description: string;
  transport: "stdio" | "sse";
  command: string;
  args: string;
  env: string; // key=value per line
  baseURL: string;
  temporalNamespace: string;
  temporalTaskQueue: string;
  temporalCluster: string;
  routingKeywords: string;
  autoRestart: boolean;
  maxRestarts: number;
}

const INITIAL_FORM: MCPFormState = {
  id: "",
  name: "",
  description: "",
  transport: "stdio",
  command: "",
  args: "",
  env: "",
  baseURL: "",
  temporalNamespace: "effgen-mcp",
  temporalTaskQueue: "mcp-servers",
  temporalCluster: "default",
  routingKeywords: "",
  autoRestart: true,
  maxRestarts: 3,
};

function configToForm(c: MCPServerConfig): MCPFormState {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    transport: c.transport,
    command: c.command || "",
    args: c.args.join(", "),
    env: Object.entries(c.env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n"),
    baseURL: c.baseURL || "",
    temporalNamespace: c.temporal.namespace,
    temporalTaskQueue: c.temporal.taskQueue,
    temporalCluster: c.temporal.cluster || "",
    routingKeywords: c.routing.keywords.join(", "),
    autoRestart: c.autoRestart,
    maxRestarts: c.maxRestarts,
  };
}

function formToPayload(f: MCPFormState): Partial<MCPServerConfig> {
  const keywords = f.routingKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const envMap: Record<string, string> = {};
  f.env
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf("=");
      if (idx > 0) envMap[line.slice(0, idx)] = line.slice(idx + 1);
    });

  return {
    id: f.id.trim(),
    name: f.name.trim(),
    description: f.description.trim(),
    transport: f.transport,
    command: f.transport === "stdio" ? f.command.trim() : "",
    args:
      f.transport === "stdio"
        ? f.args
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
    env: envMap,
    baseURL: f.transport === "sse" ? f.baseURL.trim() : "",
    temporal: {
      namespace: f.temporalNamespace.trim() || "effgen-mcp",
      taskQueue: f.temporalTaskQueue.trim() || "mcp-servers",
      cluster: f.temporalCluster.trim() || "default",
    },
    routing: { keywords },
    autoRestart: f.autoRestart,
    maxRestarts: f.maxRestarts,
  };
}

// --- Tool invocation state ---

interface ToolInvokeState {
  serverId: string;
  toolName: string;
  params: string;
  result: string | null;
  loading: boolean;
  error: string | null;
}

// --- Server card ---

interface ServerCardProps {
  config: MCPServerConfig;
  runtime?: MCPServerInfo;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  actionLoading: string | null;
  tools: { name: string; description: string }[];
  toolsLoading: boolean;
  onInvokeTool: (toolName: string) => void;
}

function ServerCard({
  config,
  runtime,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onStart,
  onStop,
  onRestart,
  actionLoading,
  tools,
  toolsLoading,
  onInvokeTool,
}: ServerCardProps) {
  const status = runtime?.status ?? "stopped";
  const isRunning = status === "running";
  const isTransitioning = status === "starting" || status === "restarting";
  const isThisLoading = actionLoading === config.id;

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-200 cursor-pointer hover:border-border/80",
        expanded && "ring-2 ring-primary"
      )}
      onClick={onToggle}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <CardContent className="p-5 flex flex-col gap-4">
        {/* Top row: status + name + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "size-2.5 rounded-full shrink-0",
                STATUS_DOT[status],
                isTransitioning ? "animate-pulse" : ""
              )}
              aria-label={`Status: ${status}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{config.name}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {config.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs gap-1">
              {config.transport === "stdio" ? (
                <Terminal className="size-3" />
              ) : (
                <Globe className="size-3" />
              )}
              {config.transport}
            </Badge>
            <span
              className={cn(
                "text-xs capitalize font-medium",
                STATUS_LABEL_COLOR[status]
              )}
            >
              {status}
            </span>
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Description */}
        {config.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {config.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {config.autoRestart && (
            <span>
              Auto-restart (max {config.maxRestarts})
            </span>
          )}
          {runtime && runtime.restartCount > 0 && (
            <span className="flex items-center gap-1">
              <RotateCcw className="size-3 shrink-0" />
              {runtime.restartCount} restart
              {runtime.restartCount !== 1 ? "s" : ""}
            </span>
          )}
          {runtime?.workflowId && (
            <span className="flex items-center gap-1">
              Workflow:{" "}
              <span className="font-mono text-foreground truncate max-w-[140px] inline-block align-bottom">
                {runtime.workflowId}
              </span>
            </span>
          )}
          {config.transport === "stdio" && config.command && (
            <span className="font-mono text-foreground">
              {config.command} {config.args?.slice(0, 2).join(" ")}
              {(config.args?.length ?? 0) > 2 ? " ..." : ""}
            </span>
          )}
          {config.transport === "sse" && config.baseURL && (
            <span className="font-mono text-foreground truncate max-w-[200px]">
              {config.baseURL}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-2 pt-2 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {!isRunning && !isTransitioning && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              disabled={isThisLoading}
              className="gap-1"
            >
              {isThisLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              Start
            </Button>
          )}
          {(isRunning || isTransitioning) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onStop}
                disabled={isThisLoading || !isRunning}
                className="gap-1"
              >
                {isThisLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Square className="size-3.5" />
                )}
                Stop
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRestart}
                disabled={isThisLoading || !isRunning}
                className="gap-1"
              >
                <RotateCcw className="size-3.5" />
                Restart
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onEdit}
            aria-label={`Edit ${config.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label={`Delete ${config.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {/* Expanded: tools panel */}
        {expanded && (
          <div
            className="flex flex-col gap-3 pt-2 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tools
            </p>
            {toolsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading tools...
              </div>
            )}
            {!toolsLoading && !isRunning && (
              <p className="text-xs text-muted-foreground italic">
                Start the server to see available tools
              </p>
            )}
            {!toolsLoading && isRunning && tools.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No tools registered
              </p>
            )}
            {!toolsLoading && tools.length > 0 && (
              <div className="flex flex-col gap-2">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="rounded-2xl border border-border bg-muted/30 px-4 py-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-foreground">
                        {tool.name}
                      </p>
                      {tool.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {tool.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 shrink-0 gap-1 text-xs"
                      onClick={() => onInvokeTool(tool.name)}
                    >
                      <Send className="size-3" />
                      Invoke
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Server details */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
              Configuration
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Transport</span>
              <span className="font-mono">{config.transport}</span>
              {config.transport === "stdio" && (
                <>
                  <span className="text-muted-foreground">Command</span>
                  <span className="font-mono truncate">{config.command}</span>
                  <span className="text-muted-foreground">Args</span>
                  <span className="font-mono truncate">
                    {config.args?.join(" ") ?? "—"}
                  </span>
                </>
              )}
              {config.transport === "sse" && (
                <>
                  <span className="text-muted-foreground">Base URL</span>
                  <span className="font-mono truncate">{config.baseURL}</span>
                </>
              )}
              <span className="text-muted-foreground">Namespace</span>
              <span className="font-mono">{config.temporal.namespace}</span>
              <span className="text-muted-foreground">Task Queue</span>
              <span className="font-mono">{config.temporal.taskQueue}</span>
              {config.routing?.keywords && config.routing.keywords.length > 0 && (
                <>
                  <span className="text-muted-foreground">Keywords</span>
                  <span>{config.routing.keywords.join(", ")}</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main panel ---

export function MCPPanel() {
  const [configs, setConfigs] = useState<MCPServerConfig[]>([]);
  const [runtimeMap, setRuntimeMap] = useState<Record<string, MCPServerInfo>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);

  // Action loading per server
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Tools per server (fetched on expand when running)
  const [toolsMap, setToolsMap] = useState<
    Record<string, { name: string; description: string }[]>
  >({});
  const [toolsLoading, setToolsLoading] = useState<string | null>(null);

  // Tool invocation
  const [invokeState, setInvokeState] = useState<ToolInvokeState | null>(null);

  // Create / Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MCPServerConfig | null>(
    null
  );
  const [form, setForm] = useState<MCPFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const cfgs = await listMCPConfigs();
        setConfigs(cfgs);

        // Try to load runtime — may fail if Temporal is down
        try {
          const servers = await listMCPServers();
          const map: Record<string, MCPServerInfo> = {};
          for (const s of servers) map[s.serverId] = s;
          setRuntimeMap(map);
          setRuntimeUnavailable(false);
        } catch {
          setRuntimeUnavailable(true);
          setRuntimeMap({});
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load MCP configs"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch tools when a running server is expanded
  useEffect(() => {
    if (!expandedId) return;
    const runtime = runtimeMap[expandedId];
    if (!runtime || runtime.status !== "running") return;
    if (toolsMap[expandedId]) return; // already fetched

    setToolsLoading(expandedId);
    listMCPServerTools(expandedId)
      .then((tools) => {
        setToolsMap((prev) => ({ ...prev, [expandedId]: tools }));
      })
      .catch(() => {
        // silently fail — tools just won't show
      })
      .finally(() => setToolsLoading(null));
  }, [expandedId, runtimeMap, toolsMap]);

  // --- CRUD handlers ---

  function openCreate() {
    setEditingConfig(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  }

  function openEdit(config: MCPServerConfig) {
    setEditingConfig(config);
    setForm(configToForm(config));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingConfig(null);
    setForm(INITIAL_FORM);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.id.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingConfig) {
        const updated = await updateMCPConfig(editingConfig.id, formToPayload(form));
        setConfigs((prev) =>
          prev.map((c) => (c.id === editingConfig.id ? updated : c))
        );
      } else {
        const created = await createMCPConfig(formToPayload(form));
        setConfigs((prev) => [...prev, created]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(config: MCPServerConfig) {
    if (
      !window.confirm(
        `Delete MCP server "${config.name}"? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteMCPConfig(config.id);
      setConfigs((prev) => prev.filter((c) => c.id !== config.id));
      if (editingConfig?.id === config.id) closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete config");
    }
  }

  // --- Runtime handlers ---

  async function handleStart(serverId: string) {
    setActionLoading(serverId);
    setError(null);
    try {
      await startMCPServer(serverId);
      // Give a moment then refresh runtime status
      setTimeout(() => fetchAll(true), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start server");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop(serverId: string) {
    setActionLoading(serverId);
    setError(null);
    try {
      await stopMCPServer(serverId);
      setTimeout(() => fetchAll(true), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop server");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestart(serverId: string) {
    setActionLoading(serverId);
    setError(null);
    try {
      await restartMCPServer(serverId);
      // Clear cached tools so they refresh
      setToolsMap((prev) => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
      setTimeout(() => fetchAll(true), 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to restart server"
      );
    } finally {
      setActionLoading(null);
    }
  }

  // --- Tool invocation ---

  function openInvoke(serverId: string, toolName: string) {
    setInvokeState({
      serverId,
      toolName,
      params: "{}",
      result: null,
      loading: false,
      error: null,
    });
  }

  async function handleInvoke() {
    if (!invokeState) return;
    setInvokeState((s) => (s ? { ...s, loading: true, error: null, result: null } : s));
    try {
      const params = JSON.parse(invokeState.params);
      const result = await invokeMCPTool(
        invokeState.serverId,
        invokeState.toolName,
        params
      );
      setInvokeState((s) =>
        s
          ? {
              ...s,
              loading: false,
              result: JSON.stringify(result, null, 2),
            }
          : s
      );
    } catch (err) {
      setInvokeState((s) =>
        s
          ? {
              ...s,
              loading: false,
              error: err instanceof Error ? err.message : "Invocation failed",
            }
          : s
      );
    }
  }

  const isFormOpen = showForm || !!editingConfig;
  const runningCount = Object.values(runtimeMap).filter(
    (s) => s.status === "running"
  ).length;

  // Shared input class
  const inputCls =
    "h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all";
  const textareaCls =
    "rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all resize-none";

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            MCP Servers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Model Context Protocol server configuration & runtime
          </p>
        </div>
        <div className="flex items-center gap-3">
          {configs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="text-success font-semibold">{runningCount}</span>
              {" / "}
              {configs.length} running
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={loading || refreshing}
            aria-label="Refresh MCP servers"
          >
            <RefreshCw
              className={cn("size-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isFormOpen ? closeForm() : openCreate())}
          >
            {isFormOpen ? (
              <X className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {isFormOpen ? "Cancel" : "Add Server"}
          </Button>
        </div>
      </div>

      {/* Runtime unavailable banner */}
      {runtimeUnavailable && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Runtime features unavailable (Temporal may be down). Configuration
          management still works.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create / Edit Form */}
      {isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {editingConfig ? (
                <>
                  <Pencil className="size-4 text-primary" />
                  Edit Server — {editingConfig.name}
                </>
              ) : (
                <>
                  <Plus className="size-4 text-primary" />
                  New MCP Server
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            {/* Basic Info */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Basic Info
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">ID *</label>
                <input
                  type="text"
                  value={form.id}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, id: e.target.value }))
                  }
                  placeholder="my-mcp-server"
                  disabled={!!editingConfig}
                  className={cn(
                    inputCls,
                    "font-mono",
                    editingConfig && "opacity-60 cursor-not-allowed"
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="My MCP Server"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, description: e.target.value }))
                  }
                  placeholder="What does this MCP server do?"
                  rows={2}
                  className={textareaCls}
                />
              </div>
            </div>

            {/* Transport */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
              Transport
            </p>
            <div className="flex gap-3">
              {(["stdio", "sse"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((s) => ({ ...s, transport: t }))}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                    form.transport === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-foreground border-input hover:bg-muted"
                  )}
                >
                  {t === "stdio" ? (
                    <Terminal className="size-4" />
                  ) : (
                    <Globe className="size-4" />
                  )}
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Transport-specific fields */}
            {form.transport === "stdio" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    Command
                  </label>
                  <input
                    type="text"
                    value={form.command}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, command: e.target.value }))
                    }
                    placeholder="npx"
                    className={cn(inputCls, "font-mono")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    Args (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.args}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, args: e.target.value }))
                    }
                    placeholder="-y, @modelcontextprotocol/server-filesystem, /tmp"
                    className={cn(inputCls, "font-mono")}
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">
                    Environment Variables (KEY=VALUE, one per line)
                  </label>
                  <textarea
                    value={form.env}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, env: e.target.value }))
                    }
                    placeholder={"BRAVE_API_KEY=sk-...\nNODE_ENV=production"}
                    rows={2}
                    className={cn(textareaCls, "font-mono")}
                  />
                </div>
              </div>
            )}
            {form.transport === "sse" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Base URL
                </label>
                <input
                  type="text"
                  value={form.baseURL}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, baseURL: e.target.value }))
                  }
                  placeholder="https://mcp.example.com/sse"
                  className={cn(inputCls, "font-mono")}
                />
              </div>
            )}

            {/* Temporal Settings */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
              Temporal Settings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Namespace
                </label>
                <input
                  type="text"
                  value={form.temporalNamespace}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      temporalNamespace: e.target.value,
                    }))
                  }
                  placeholder="effgen-mcp"
                  className={cn(inputCls, "font-mono")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Task Queue
                </label>
                <input
                  type="text"
                  value={form.temporalTaskQueue}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      temporalTaskQueue: e.target.value,
                    }))
                  }
                  placeholder="mcp-servers"
                  className={cn(inputCls, "font-mono")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Cluster
                </label>
                <input
                  type="text"
                  value={form.temporalCluster}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      temporalCluster: e.target.value,
                    }))
                  }
                  placeholder="default"
                  className={cn(inputCls, "font-mono")}
                />
              </div>
            </div>

            {/* Routing & Restart */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
              Routing & Restart
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Routing Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.routingKeywords}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      routingKeywords: e.target.value,
                    }))
                  }
                  placeholder="filesystem, file, read"
                  className={inputCls}
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">
                    Max Restarts
                  </label>
                  <input
                    type="number"
                    value={form.maxRestarts}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        maxRestarts: parseInt(e.target.value) || 0,
                      }))
                    }
                    min={0}
                    max={10}
                    className={cn(inputCls, "w-24")}
                  />
                </div>
                <label className="flex items-center gap-2 h-10 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoRestart}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        autoRestart: e.target.checked,
                      }))
                    }
                    className="rounded border-input"
                  />
                  Auto-restart
                </label>
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={
                  saving || !form.name.trim() || !form.id.trim()
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : editingConfig ? (
                  <>
                    <Pencil className="size-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create Server
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Invocation Dialog */}
      {invokeState && (
        <Card className="border-ale-blue/30">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="size-4 text-ale-blue" />
              Invoke Tool — {invokeState.toolName}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                on {invokeState.serverId}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Parameters (JSON)
              </label>
              <textarea
                value={invokeState.params}
                onChange={(e) =>
                  setInvokeState((s) =>
                    s ? { ...s, params: e.target.value } : s
                  )
                }
                rows={4}
                className={cn(textareaCls, "font-mono text-xs")}
                placeholder='{ "key": "value" }'
              />
            </div>
            {invokeState.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {invokeState.error}
              </div>
            )}
            {invokeState.result && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Result</label>
                <pre className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-foreground overflow-auto max-h-60 whitespace-pre-wrap">
                  {invokeState.result}
                </pre>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInvokeState(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleInvoke}
                disabled={invokeState.loading}
                className="gap-1"
              >
                {invokeState.loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {invokeState.loading ? "Running..." : "Invoke"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card h-40 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && configs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <Server className="size-10 opacity-30" />
          <p className="text-sm">No MCP servers configured</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Add Server
          </Button>
        </div>
      )}

      {/* Server grid */}
      {!loading && configs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {configs.map((config) => (
            <ServerCard
              key={config.id}
              config={config}
              runtime={runtimeMap[config.id]}
              expanded={expandedId === config.id}
              onToggle={() =>
                setExpandedId((c) => (c === config.id ? null : config.id))
              }
              onEdit={() => openEdit(config)}
              onDelete={() => handleDelete(config)}
              onStart={() => handleStart(config.id)}
              onStop={() => handleStop(config.id)}
              onRestart={() => handleRestart(config.id)}
              actionLoading={actionLoading}
              tools={toolsMap[config.id] ?? []}
              toolsLoading={toolsLoading === config.id}
              onInvokeTool={(toolName) => openInvoke(config.id, toolName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
