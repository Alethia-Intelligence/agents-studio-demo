"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, RotateCcw, ChevronDown, ChevronUp, Server, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listMCPServers } from "@/lib/api-client";
import type { MCPServerInfo } from "@/types/api";

// Usage:
// <MCPPanel />

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

interface ServerCardProps {
  server: MCPServerInfo;
  expanded: boolean;
  onToggle: () => void;
}

function ServerCard({ server, expanded, onToggle }: ServerCardProps) {
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
        {/* Top: status dot + server name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "size-2.5 rounded-full shrink-0",
                STATUS_DOT[server.status],
                server.status === "starting" || server.status === "restarting"
                  ? "animate-pulse"
                  : ""
              )}
              aria-label={`Status: ${server.status}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{server.name}</p>
              <p
                className={cn(
                  "text-xs mt-0.5 capitalize",
                  STATUS_LABEL_COLOR[server.status]
                )}
              >
                {server.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              {server.transport}
            </Badge>
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {server.restartCount > 0 && (
            <span className="flex items-center gap-1">
              <RotateCcw className="size-3 shrink-0" />
              {server.restartCount} restart{server.restartCount !== 1 ? "s" : ""}
            </span>
          )}
          {server.workflowId && (
            <span className="flex items-center gap-1">
              Workflow:{" "}
              <span className="font-mono text-foreground truncate max-w-[140px] inline-block align-bottom">
                {server.workflowId}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wrench className="size-3 shrink-0" />
            {server.tools.length} tool{server.tools.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tools section — collapsible */}
        {expanded && server.tools.length > 0 && (
          <div
            className="flex flex-col gap-2 pt-2 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tools ({server.tools.length})
            </p>
            <div className="flex flex-col gap-2">
              {server.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-2xl border border-border bg-muted/30 px-4 py-3"
                >
                  <p className="text-xs font-mono font-semibold text-foreground">
                    {tool.name}
                  </p>
                  {tool.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {tool.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded but no tools */}
        {expanded && server.tools.length === 0 && (
          <div
            className="pt-2 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground italic">No tools registered</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MCPPanel() {
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listMCPServers();
      setServers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MCP servers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  function toggleExpanded(serverId: string) {
    setExpandedServerId((current) => (current === serverId ? null : serverId));
  }

  const runningCount = servers.filter((s) => s.status === "running").length;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">MCP Servers</h2>
          <p className="text-sm text-muted-foreground mt-1">Model Context Protocol</p>
        </div>
        <div className="flex items-center gap-3">
          {servers.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="text-success font-semibold">{runningCount}</span>
              {" / "}
              {servers.length} running
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchServers(true)}
            disabled={loading || refreshing}
            aria-label="Refresh MCP servers"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card h-32 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && servers.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <Server className="size-10 opacity-30" />
          <p className="text-sm">No MCP servers registered</p>
        </div>
      )}

      {/* Server grid */}
      {!loading && servers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {servers.map((server) => (
            <ServerCard
              key={server.serverId}
              server={server}
              expanded={expandedServerId === server.serverId}
              onToggle={() => toggleExpanded(server.serverId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
