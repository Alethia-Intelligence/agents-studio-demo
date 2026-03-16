"use client";

// Usage:
// import { ExecutePanel } from "@/components/agents/execute-panel";
// <ExecutePanel />

import { useState, useEffect } from "react";
import { Play, Loader2, ChevronDown, ChevronUp, Zap, Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDuration, formatCost, formatNumber } from "@/lib/utils";
import { listAgents, executeAgent } from "@/lib/api-client";
import type { AgentInfo, ExecuteResponse, AgentRunStep, ConsideredModel } from "@/types/api";

type Mode = "standard" | "agentic";

const EXECUTION_PATH_VARIANT: Record<string, "blue" | "indigo" | "magenta"> = {
  single: "blue",
  parallel: "indigo",
  hierarchical: "magenta",
};

function StepCard({ step }: { step: AgentRunStep }) {
  const [expanded, setExpanded] = useState(false);

  const typeBadgeVariant =
    step.type === "tool_execution" ? "orange" : step.type === "approval_wait" ? "warning" : "blue";

  return (
    <Card className="bg-background/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground shrink-0">#{step.stepNumber}</span>
            <Badge variant={typeBadgeVariant} className="shrink-0">
              {step.type.replace("_", " ")}
            </Badge>
            {step.toolName && (
              <span className="text-xs font-mono text-foreground truncate">{step.toolName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
            <span>{formatDuration(step.durationMs)}</span>
            <span>{formatNumber(step.tokensUsed)} tok</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 text-xs font-mono">
            {step.error && (
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">{step.error}</div>
            )}
            <div>
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Input</span>
              <p className="mt-1 text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
                {step.input}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Output</span>
              <p className="mt-1 text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
                {step.output}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExecutePanel() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("standard");
  const [maxIterations, setMaxIterations] = useState(10);
  const [maxTokens, setMaxTokens] = useState(50000);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [routingExpanded, setRoutingExpanded] = useState(false);
  const [modelsExpanded, setModelsExpanded] = useState(false);

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => {});
  }, []);

  async function handleExecute() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      const result = await executeAgent({
        query: query.trim(),
        agentId: selectedAgentId || undefined,
        mode,
        ...(mode === "agentic" ? { maxIterations, maxTokensPerRun: maxTokens } : {}),
      });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setLoading(false);
    }
  }

  const pathVariant =
    response
      ? EXECUTION_PATH_VARIANT[response.executionPath?.toLowerCase()] ?? "blue"
      : "blue";

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 w-full">
      {/* Left column — controls */}
      <div className="flex flex-col gap-5 lg:w-[60%]">
        <h2 className="text-xl font-semibold tracking-tight">Execute Agent</h2>

        {/* Agent selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Agent</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all cursor-pointer"
          >
            <option value="">Auto-route</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Mode</label>
          <div className="flex gap-2">
            {(["standard", "agentic"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 h-10 rounded-2xl border text-sm font-medium transition-all capitalize",
                  mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-input text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {m === "agentic" && <Zap className="inline size-3.5 mr-1 -mt-0.5" />}
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Agentic options */}
        {mode === "agentic" && (
          <div className="flex flex-col gap-4 rounded-2xl border border-input bg-card/50 p-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">
                  Max Iterations
                </label>
                <span className="text-sm font-semibold tabular-nums">{maxIterations}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span>
                <span>20</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Max Tokens per Run
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min={1000}
                step={1000}
                className="h-10 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
              />
            </div>
          </div>
        )}

        {/* Query textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExecute();
            }}
            placeholder="Enter your query..."
            rows={6}
            className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all resize-y min-h-[9rem]"
          />
          <p className="text-[11px] text-muted-foreground">
            Press Cmd+Enter to execute
          </p>
        </div>

        {/* Execute button */}
        <Button
          onClick={handleExecute}
          disabled={loading || !query.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Execute
            </>
          )}
        </Button>
      </div>

      {/* Right column — response */}
      <div className="flex flex-col gap-4 lg:w-[40%]">
        <h2 className="text-xl font-semibold tracking-tight">Response</h2>

        {!response && !loading && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-input py-16">
            <p className="text-sm text-muted-foreground">Execute a query to see results</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-input py-16">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Running inference...</p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span className="break-all">{error}</span>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-destructive/70 hover:text-destructive transition-colors"
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {response && (
          <div className="flex flex-col gap-4">
            {/* Response body */}
            <Card>
              <CardContent className="p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
                  {response.response}
                </pre>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Execution Metadata</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex flex-col gap-1 col-span-2">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Execution Path
                    </dt>
                    <dd>
                      <Badge variant={pathVariant} className="capitalize">
                        <Route className="size-3 mr-1" />
                        {response.executionPath}
                      </Badge>
                    </dd>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Complexity
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {response.complexityScore.toFixed(1)}
                    </dd>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Exec Time
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatDuration(response.executionTime)}
                    </dd>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Tokens Used
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatNumber(response.tokensUsed)}
                    </dd>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Auto-routed
                    </dt>
                    <dd>
                      <Badge variant={response.autoRouted ? "success" : "outline"}>
                        {response.autoRouted ? "Yes" : "No"}
                      </Badge>
                    </dd>
                  </div>

                  <div className="flex flex-col gap-0.5 col-span-2">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Selected Agent
                    </dt>
                    <dd className="font-medium text-foreground/90 font-mono text-xs">
                      {response.selectedAgent}
                    </dd>
                  </div>

                  {response.selectedModel && (
                    <div className="flex flex-col gap-0.5 col-span-2">
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Model
                      </dt>
                      <dd className="font-mono text-xs text-foreground/90">
                        {response.selectedModel}
                      </dd>
                    </div>
                  )}

                  {response.estimatedCost != null && (
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Est. Cost
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCost(response.estimatedCost)}
                      </dd>
                    </div>
                  )}

                  {mode === "agentic" && response.iterationCount != null && (
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Iterations
                      </dt>
                      <dd className="font-semibold tabular-nums">{response.iterationCount}</dd>
                    </div>
                  )}

                  {mode === "agentic" && response.stopReason && (
                    <div className="flex flex-col gap-0.5 col-span-2">
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Stop Reason
                      </dt>
                      <dd className="text-xs text-foreground/80 capitalize">
                        {response.stopReason.replace(/_/g, " ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Agentic steps */}
            {mode === "agentic" && response.steps && response.steps.length > 0 && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <button
                    onClick={() => setStepsExpanded((v) => !v)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <CardTitle className="text-sm">
                      Execution Steps
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({response.steps.length})
                      </span>
                    </CardTitle>
                    {stepsExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </CardHeader>

                {stepsExpanded && (
                  <CardContent className="p-4 pt-0 flex flex-col gap-2">
                    {response.steps.map((step) => (
                      <StepCard key={step.id} step={step} />
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            {/* AI Proxy Routing */}
            {response.routing && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <button
                    onClick={() => setRoutingExpanded((v) => !v)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <CardTitle className="text-sm">
                      AI Proxy Routing
                    </CardTitle>
                    {routingExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </CardHeader>

                {routingExpanded && (
                  <CardContent className="p-4 pt-0">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Provider
                        </dt>
                        <dd className="font-mono text-xs text-foreground/90">
                          {response.routing.selectedProvider}
                        </dd>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Strategy
                        </dt>
                        <dd className="font-mono text-xs text-foreground/90">
                          {response.routing.strategy.replace(/_/g, " ")}
                        </dd>
                      </div>

                      <div className="flex flex-col gap-0.5 col-span-2">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Selection Reason
                        </dt>
                        <dd className="text-xs text-foreground/80">
                          {response.routing.selectionReason.replace(/_/g, " ")}
                        </dd>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          AI Proxy Complexity
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {response.routing.complexityScore.toFixed(3)}
                        </dd>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Routing Time
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {formatDuration(response.routing.durationMs)}
                        </dd>
                      </div>

                      {response.proxyDurationMs != null && (
                        <div className="flex flex-col gap-0.5">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Proxy Duration
                          </dt>
                          <dd className="font-semibold tabular-nums">
                            {formatDuration(response.proxyDurationMs)}
                          </dd>
                        </div>
                      )}

                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Cache Hit
                        </dt>
                        <dd>
                          <Badge variant={response.cacheHit ? "success" : "outline"}>
                            {response.cacheHit ? "Yes" : "No"}
                          </Badge>
                        </dd>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Cost Savings
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {formatCost(response.routing.estimatedCostSavings)}
                        </dd>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Fallback Used
                        </dt>
                        <dd>
                          <Badge variant={response.routing.fallbackUsed ? "warning" : "outline"}>
                            {response.routing.fallbackUsed ? "Yes" : "No"}
                          </Badge>
                        </dd>
                      </div>

                      {response.requestId && (
                        <div className="flex flex-col gap-0.5 col-span-2">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Request ID
                          </dt>
                          <dd className="font-mono text-xs text-foreground/90 truncate" title={response.requestId}>
                            {response.requestId}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {/* Considered Models */}
                    {response.routing.consideredModels && response.routing.consideredModels.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => setModelsExpanded((v) => !v)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {modelsExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                          Considered Models ({response.routing.consideredModels.length})
                        </button>

                        {modelsExpanded && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {response.routing.consideredModels.map((model: ConsideredModel) => (
                              <div
                                key={`${model.provider}-${model.modelId}`}
                                className="flex items-center justify-between gap-2 rounded-lg border border-input bg-background/50 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="font-mono text-xs text-foreground truncate">
                                    {model.modelId}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {model.provider} &middot; {model.reason.replace(/_/g, " ")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-semibold tabular-nums">
                                    {model.finalScore.toFixed(3)}
                                  </span>
                                  <Badge variant={model.eligible ? "success" : "outline"} className="text-[10px]">
                                    {model.eligible ? "eligible" : "ineligible"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
