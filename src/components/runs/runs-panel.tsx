"use client";

// Usage:
// import { RunsPanel } from "@/components/runs/runs-panel";
// <RunsPanel agentId="my-agent-id" />

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Route,
  Coins,
  Clock,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDuration, formatNumber, formatCost, timeAgo } from "@/lib/utils";
import { listRuns, getRun } from "@/lib/api-client";
import type { AgentRun, AgentRunStep } from "@/types/api";

// ---------- helpers ----------

type StatusVariant = "success" | "blue" | "destructive" | "warning";
const STATUS_VARIANT: Record<AgentRun["status"], StatusVariant> = {
  completed: "success",
  running: "blue",
  failed: "destructive",
  cancelled: "warning",
};

type PathVariant = "blue" | "indigo" | "magenta";
const PATH_VARIANT: Record<string, PathVariant> = {
  single: "blue",
  parallel: "indigo",
  hierarchical: "magenta",
};

function pathVariant(p: string): PathVariant {
  return PATH_VARIANT[p?.toLowerCase()] ?? "blue";
}

// ---------- step list ----------

function StepList({ steps }: { steps: AgentRunStep[] }) {
  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-input mt-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Steps ({steps.length})
      </span>
      {steps.map((step) => {
        const typeBadgeVariant =
          step.type === "tool_execution"
            ? "orange"
            : step.type === "approval_wait"
            ? "warning"
            : "blue";

        return (
          <div
            key={step.id}
            className="rounded-xl border border-input bg-background/40 px-3 py-2 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  #{step.stepNumber}
                </span>
                <Badge variant={typeBadgeVariant} className="text-[10px]">
                  {step.type.replace("_", " ")}
                </Badge>
                {step.toolName && (
                  <span className="text-xs font-mono text-foreground/80">{step.toolName}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(step.durationMs)}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="size-3" />
                  {formatNumber(step.tokensUsed)}
                </span>
              </div>
            </div>

            {step.error && (
              <p className="text-xs text-destructive font-mono">{step.error}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  Input
                </p>
                <p className="text-xs font-mono text-foreground/70 line-clamp-3 break-all">
                  {step.input}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  Output
                </p>
                <p className="text-xs font-mono text-foreground/70 line-clamp-3 break-all">
                  {step.output}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- run card ----------

function RunCard({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false);
  const [detailedRun, setDetailedRun] = useState<(AgentRun & { steps: AgentRunStep[] }) | null>(
    null
  );
  const [loadingSteps, setLoadingSteps] = useState(false);

  async function handleExpand() {
    if (!expanded && !detailedRun) {
      setLoadingSteps(true);
      try {
        const full = await getRun(run.agentId, run.id);
        setDetailedRun(full);
      } catch {
        // fall back to run without steps
      } finally {
        setLoadingSteps(false);
      }
    }
    setExpanded((v) => !v);
  }

  const statusVariant = STATUS_VARIANT[run.status];
  const pVariant = pathVariant(run.executionPath);

  const steps = detailedRun?.steps ?? run.steps;

  return (
    <Card
      className={cn(
        "transition-all duration-200 cursor-pointer hover:border-border/80",
        expanded && "ring-1 ring-primary/30"
      )}
      onClick={handleExpand}
    >
      <CardContent className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge variant={statusVariant} className="capitalize shrink-0">
              {run.status}
            </Badge>
            <p className="text-sm text-foreground line-clamp-1 min-w-0">{run.query}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {loadingSteps && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Response preview */}
        {run.response && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1 font-mono">
            {run.response}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatDuration(run.executionTimeMs)}
          </span>
          <span className="flex items-center gap-1">
            <Coins className="size-3" />
            {formatNumber(run.tokensUsed)} tokens
          </span>
          <span className="flex items-center gap-1">
            <Activity className="size-3" />
            {run.complexityScore.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Route className="size-3" />
            <Badge variant={pVariant} className="text-[10px] capitalize py-0.5 px-2">
              {run.executionPath}
            </Badge>
          </span>
          {run.startedAt && (
            <span className="ml-auto">{timeAgo(run.startedAt)}</span>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div
            className="mt-3 pt-3 border-t border-input"
            onClick={(e) => e.stopPropagation()}
          >
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs mb-3">
              <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Full Response
                </dt>
                <dd className="font-mono text-foreground/90 whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-y-auto">
                  {run.response}
                </dd>
              </div>

              {run.selectedModel && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Model
                  </dt>
                  <dd className="font-mono">{run.selectedModel}</dd>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Auto-routed
                </dt>
                <dd>
                  <Badge variant={run.autoRouted ? "success" : "outline"}>
                    {run.autoRouted ? "Yes" : "No"}
                  </Badge>
                </dd>
              </div>

              {run.estimatedCost != null && run.estimatedCost > 0 && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Est. Cost
                  </dt>
                  <dd className="font-semibold">{formatCost(run.estimatedCost)}</dd>
                </div>
              )}

              {run.iterationCount != null && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Iterations
                  </dt>
                  <dd className="font-semibold tabular-nums">{run.iterationCount}</dd>
                </div>
              )}

              {run.stopReason && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Stop Reason
                  </dt>
                  <dd className="capitalize">{run.stopReason.replace(/_/g, " ")}</dd>
                </div>
              )}

              {run.errorDetails && (
                <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Error
                  </dt>
                  <dd className="font-mono text-destructive text-xs">{run.errorDetails}</dd>
                </div>
              )}

              <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Workflow ID
                </dt>
                <dd className="font-mono text-[11px] text-muted-foreground truncate">
                  {run.workflowId} / {run.runId}
                </dd>
              </div>
            </dl>

            {steps && steps.length > 0 && <StepList steps={steps} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- main panel ----------

interface RunsPanelProps {
  agentId: string;
}

export function RunsPanel({ agentId }: RunsPanelProps) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const data = await listRuns(agentId);
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Runs
          {runs.length > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({runs.length})
            </span>
          )}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRuns}
          disabled={loading}
          aria-label="Refresh runs"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading && runs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input py-16 gap-2">
          <p className="text-sm text-muted-foreground">No runs found for this agent</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
