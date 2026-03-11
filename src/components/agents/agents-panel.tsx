"use client";

import * as React from "react";
import {
  Bot,
  Pencil,
  Play,
  Trash2,
  Wrench,
  Search,
  Plus,
  X,
  Loader2,
  Sparkles,
  TrendingDown,
  Target,
  Zap,
  Cpu,
  Settings2,
  BrainCircuit,
  Route,
  Globe,
  Gauge,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getStats,
} from "@/lib/api-client";
import type { AgentInfo, AgentStats } from "@/types/api";

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  dotColor: string;
  borderColor: string;
}

function StatCard({ label, value, dotColor, borderColor }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden border-l-4", borderColor)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            <span className="text-2xl font-bold text-foreground leading-none">
              {value}
            </span>
          </div>
          <span
            className={cn("mt-1 size-2.5 rounded-full shrink-0", dotColor)}
            aria-hidden="true"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status badge helper ───────────────────────────────────────────────────────

function statusBadge(status: AgentInfo["status"]) {
  switch (status) {
    case "published":
    case "ready":
      return <Badge variant="success">Published</Badge>;
    case "draft":
      return <Badge variant="warning">Draft</Badge>;
    case "archived":
      return <Badge variant="destructive">Archived</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Agent form ──────────────────────────────────────────────────────────────

const AUTONOMY_OPTIONS = ["read-only", "guided", "full-automation"];

interface AgentFormValues {
  id: string;
  name: string;
  description: string;
  // Model
  model: string;
  provider: string;
  modelRoutingStrategy: string;
  routingEngine: string;
  preferredTier: string;
  requiredCapabilities: string;
  maxCostPerRequest: string;
  fallbackEnabled: boolean;
  // Execution
  maxTokens: string;
  temperature: string;
  maxIterations: string;
  maxTokensPerRun: string;
  timeoutSeconds: string;
  autonomyLevel: string;
  // Temporal
  temporalNamespace: string;
  temporalTaskQueue: string;
  // Routing
  routingKeywords: string;
  routingExamples: string;
  routingThreshold: string;
  // Tools
  tools: string;
  // Other
  systemPrompt: string;
}

const EMPTY_FORM: AgentFormValues = {
  id: "",
  name: "",
  description: "",
  model: "",
  provider: "",
  modelRoutingStrategy: "",
  routingEngine: "heuristic",
  preferredTier: "",
  requiredCapabilities: "",
  maxCostPerRequest: "",
  fallbackEnabled: true,
  maxTokens: "",
  temperature: "",
  maxIterations: "10",
  maxTokensPerRun: "4096",
  timeoutSeconds: "300",
  autonomyLevel: "guided",
  temporalNamespace: "default",
  temporalTaskQueue: "effgen-agents",
  routingKeywords: "",
  routingExamples: "",
  routingThreshold: "",
  tools: "",
  systemPrompt: "",
};

function agentToForm(agent: AgentInfo): AgentFormValues {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? "",
    model: agent.model?.model ?? "",
    provider: agent.model?.provider ?? "",
    modelRoutingStrategy: agent.model?.routingStrategy ?? "",
    routingEngine: agent.model?.routingEngine ?? "heuristic",
    preferredTier: agent.model?.preferredTier ?? "",
    requiredCapabilities: agent.model?.requiredCapabilities?.join(", ") ?? "",
    maxCostPerRequest: agent.model?.maxCostPerRequest?.toString() ?? "",
    fallbackEnabled: agent.model?.fallbackEnabled ?? true,
    maxTokens: "",
    temperature: "",
    maxIterations: agent.maxIterations?.toString() ?? "10",
    maxTokensPerRun: agent.maxTokensPerRun?.toString() ?? "4096",
    timeoutSeconds: agent.timeoutSeconds?.toString() ?? "300",
    autonomyLevel: agent.autonomyLevel ?? "guided",
    temporalNamespace: agent.temporal?.namespace ?? "default",
    temporalTaskQueue: agent.temporal?.taskQueue ?? "effgen-agents",
    routingKeywords: agent.routing?.keywords?.join(", ") ?? "",
    routingExamples: agent.routing?.examples?.join("\n") ?? "",
    routingThreshold: agent.routing?.threshold?.toString() ?? "",
    tools: agent.tools?.enabled?.join(", ") ?? "",
    systemPrompt: "",
  };
}

// ─── Tile picker ─────────────────────────────────────────────────────────────

interface TileOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

function TileGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: TileOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium transition-all min-w-[88px]",
              active
                ? "border-primary bg-primary/8 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/60",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <span className={cn("size-5", active ? "text-primary" : "text-muted-foreground/70")}>
              {opt.icon}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const STRATEGY_OPTIONS: TileOption[] = [
  { value: "auto", label: "Auto", icon: <Sparkles className="size-5" /> },
  { value: "cost_optimized", label: "Cost", icon: <TrendingDown className="size-5" /> },
  { value: "quality_optimized", label: "Quality", icon: <Target className="size-5" /> },
  { value: "speed_optimized", label: "Speed", icon: <Zap className="size-5" /> },
];

const ENGINE_OPTIONS: TileOption[] = [
  { value: "heuristic", label: "Heuristic", icon: <Cpu className="size-5" /> },
  { value: "auto", label: "Auto", icon: <Settings2 className="size-5" /> },
  { value: "functiongemma", label: "FunctionGemma", icon: <BrainCircuit className="size-5" /> },
];

const ROUTING_TABS = [
  { key: "strategies", label: "Routing Strategies", icon: <Route className="size-3.5" /> },
  { key: "engines", label: "Routing Engines", icon: <Cpu className="size-3.5" /> },
  { key: "providers", label: "Provider Preferences", icon: <Globe className="size-3.5" /> },
  { key: "complexity", label: "Query Complexity", icon: <Gauge className="size-3.5" /> },
  { key: "cost", label: "Cost Constraints", icon: <DollarSign className="size-3.5" /> },
] as const;

type RoutingTab = (typeof ROUTING_TABS)[number]["key"];

function QuickPresets({
  values,
  set,
  saving,
  labelCls,
}: {
  values: AgentFormValues;
  set: (field: keyof AgentFormValues, value: string | boolean) => void;
  saving: boolean;
  labelCls: string;
}) {
  const [activeTab, setActiveTab] = React.useState<RoutingTab>("strategies");

  const inputCls =
    "w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">Quick Presets</span>
      </div>

      {/* Strategy */}
      <div className="mb-4">
        <p className={labelCls}>Strategy</p>
        <TileGroup
          options={STRATEGY_OPTIONS}
          value={values.modelRoutingStrategy}
          onChange={(v) => set("modelRoutingStrategy", v)}
          disabled={saving}
        />
      </div>

      {/* Engine */}
      <div className="mb-4">
        <p className={labelCls}>Engine</p>
        <TileGroup
          options={ENGINE_OPTIONS}
          value={values.routingEngine}
          onChange={(v) => set("routingEngine", v)}
          disabled={saving}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border pt-3">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-3">
          {ROUTING_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-[80px]">
          {activeTab === "strategies" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Controls how the AI Proxy selects a model for each request. <strong>Auto</strong> lets the proxy decide based on query characteristics.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Routing Threshold</label>
                  <input
                    className={inputCls}
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    placeholder="0.8"
                    value={values.routingThreshold}
                    onChange={(e) => set("routingThreshold", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === "engines" && (
            <p className="text-xs text-muted-foreground">
              <strong>Heuristic</strong> uses rule-based routing for predictable results. <strong>Auto</strong> dynamically picks the best engine per request. <strong>FunctionGemma</strong> uses a fine-tuned model to classify intent and route to the optimal provider.
            </p>
          )}
          {activeTab === "providers" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Set a preferred provider or leave as Auto to let the proxy choose the best option.
              </p>
              <div className="flex flex-wrap gap-2">
                {["", "anthropic", "openai", "google", "ollama"].map((p) => {
                  const active = values.provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={saving}
                      onClick={() => set("provider", p)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        active
                          ? "border-primary bg-primary/8 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      {p || "Auto"}
                    </button>
                  );
                })}
              </div>
              <div>
                <label className={labelCls}>Preferred Tier</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "", label: "Any" },
                    { value: "free", label: "Free" },
                    { value: "standard", label: "Standard" },
                    { value: "premium", label: "Premium" },
                  ].map((t) => {
                    const active = values.preferredTier === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        disabled={saving}
                        onClick={() => set("preferredTier", t.value)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "border-primary bg-primary/8 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {activeTab === "complexity" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Define how query complexity affects model selection. Higher-complexity queries may route to more capable (and more expensive) models.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Max Tokens per Run</label>
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    placeholder="4096"
                    value={values.maxTokensPerRun}
                    onChange={(e) => set("maxTokensPerRun", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelCls}>Max Iterations</label>
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    placeholder="10"
                    value={values.maxIterations}
                    onChange={(e) => set("maxIterations", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Required Capabilities (comma-separated)</label>
                  <input
                    className={inputCls}
                    placeholder="chat, code, vision, function_calling, embeddings"
                    value={values.requiredCapabilities}
                    onChange={(e) => set("requiredCapabilities", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === "cost" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Set cost guardrails for this agent. The proxy will respect tier and token limits when routing requests.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Max Tokens (response)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    placeholder="4096"
                    value={values.maxTokens}
                    onChange={(e) => set("maxTokens", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelCls}>Temperature</label>
                  <input
                    className={inputCls}
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    placeholder="0.7"
                    value={values.temperature}
                    onChange={(e) => set("temperature", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelCls}>Max Cost / Request (USD)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.05"
                    value={values.maxCostPerRequest}
                    onChange={(e) => set("maxCostPerRequest", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={values.fallbackEnabled}
                      onChange={(e) => set("fallbackEnabled", e.target.checked)}
                      disabled={saving}
                      className="size-4 rounded border-border accent-primary"
                    />
                    Allow model fallback on failure
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AgentFormProps {
  title: string;
  icon: React.ReactNode;
  values: AgentFormValues;
  onChange: (values: AgentFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  submitIcon: React.ReactNode;
  isEdit?: boolean;
}

function AgentForm({
  title,
  icon,
  values,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
  submitIcon,
  isEdit,
}: AgentFormProps) {
  function set(field: keyof AgentFormValues, value: string | boolean) {
    onChange({ ...values, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const sectionCls = "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-3 pb-1";

  return (
    <Card className="border-primary/30 shadow-glow-blue mb-6 animate-scale-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          {/* ── Basic Info ── */}
          <p className={sectionCls}>Basic Info</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            {!isEdit && (
              <div>
                <label htmlFor="af-id" className={labelCls}>
                  Agent ID <span className="text-destructive">*</span>
                </label>
                <input
                  id="af-id"
                  className={inputCls}
                  placeholder="e.g. my-agent"
                  value={values.id}
                  onChange={(e) => set("id", e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            )}
            <div>
              <label htmlFor="af-name" className={labelCls}>
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="af-name"
                className={inputCls}
                placeholder="e.g. Research Agent"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className={isEdit ? "" : "sm:col-span-2"}>
              <label htmlFor="af-autonomy" className={labelCls}>
                Autonomy Level
              </label>
              <select
                id="af-autonomy"
                className={cn(inputCls, "cursor-pointer")}
                value={values.autonomyLevel}
                onChange={(e) => set("autonomyLevel", e.target.value)}
                disabled={saving}
              >
                {AUTONOMY_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o.charAt(0).toUpperCase() + o.slice(1).replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="af-desc" className={labelCls}>
                Description
              </label>
              <input
                id="af-desc"
                className={inputCls}
                placeholder="What does this agent do?"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* ── Model & Routing ── */}
          <p className={sectionCls}>Model</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="af-model" className={labelCls}>
                Model
              </label>
              <input
                id="af-model"
                className={inputCls}
                placeholder="e.g. gpt-4o-mini"
                value={values.model}
                onChange={(e) => set("model", e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="af-provider" className={labelCls}>
                Provider
              </label>
              <select
                id="af-provider"
                className={cn(inputCls, "cursor-pointer")}
                value={values.provider}
                onChange={(e) => set("provider", e.target.value)}
                disabled={saving}
              >
                <option value="">Auto (AI Proxy)</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
          </div>

          {/* ── Quick Presets ── */}
          <QuickPresets values={values} set={set} saving={saving} labelCls={labelCls} />

          {/* ── Execution Limits ── */}
          <p className={sectionCls}>Execution</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-2">
            <div>
              <label htmlFor="af-timeout" className={labelCls}>
                Timeout (s)
              </label>
              <input
                id="af-timeout"
                type="number"
                min="1"
                className={inputCls}
                placeholder="300"
                value={values.timeoutSeconds}
                onChange={(e) => set("timeoutSeconds", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* ── Temporal ── */}
          <p className={sectionCls}>Temporal</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <label htmlFor="af-ns" className={labelCls}>
                Namespace
              </label>
              <input
                id="af-ns"
                className={cn(inputCls, "font-mono")}
                placeholder="default"
                value={values.temporalNamespace}
                onChange={(e) => set("temporalNamespace", e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="af-tq" className={labelCls}>
                Task Queue
              </label>
              <input
                id="af-tq"
                className={cn(inputCls, "font-mono")}
                placeholder="effgen-agents"
                value={values.temporalTaskQueue}
                onChange={(e) => set("temporalTaskQueue", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* ── Agent Routing ── */}
          <p className={sectionCls}>Agent Routing</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <label htmlFor="af-rk" className={labelCls}>
                Keywords (comma-separated)
              </label>
              <input
                id="af-rk"
                className={inputCls}
                placeholder="analyze, research, summarize"
                value={values.routingKeywords}
                onChange={(e) => set("routingKeywords", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="af-re" className={labelCls}>
                Examples (one per line)
              </label>
              <textarea
                id="af-re"
                className={cn(inputCls, "min-h-[60px] resize-y")}
                placeholder={"Analyze the quarterly report\nSummarize this article"}
                value={values.routingExamples}
                onChange={(e) => set("routingExamples", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* ── Tools ── */}
          <p className={sectionCls}>Tools</p>
          <div className="mb-2">
            <label htmlFor="af-tools" className={labelCls}>
              Enabled Tools (comma-separated)
            </label>
            <input
              id="af-tools"
              className={cn(inputCls, "font-mono")}
              placeholder="web_search, db_query, send_email"
              value={values.tools}
              onChange={(e) => set("tools", e.target.value)}
              disabled={saving}
            />
          </div>

          {/* ── System Prompt ── */}
          <div className="mb-4">
            <label htmlFor="af-sp" className={labelCls}>
              System Prompt
            </label>
            <textarea
              id="af-sp"
              className={cn(inputCls, "min-h-[88px] resize-y")}
              placeholder="Optional system prompt for this agent…"
              value={values.systemPrompt}
              onChange={(e) => set("systemPrompt", e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="size-4" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || (!isEdit && !values.id) || !values.name}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                submitIcon
              )}
              {saving ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: AgentInfo;
  onEdit: (agent: AgentInfo) => void;
  onExecute: (agent: AgentInfo) => void;
  onDelete: (agent: AgentInfo) => void;
}

function AgentCard({ agent, onEdit, onExecute, onDelete }: AgentCardProps) {
  const toolCount = agent.tools?.enabled?.length ?? 0;

  return (
    <Card className="flex flex-col group hover:border-primary/40 transition-all duration-200 hover:shadow-elegant">
      <CardContent className="flex flex-col flex-1 p-5 gap-3">
        {/* Top row: name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot
              className="size-4 text-primary shrink-0"
              aria-hidden="true"
            />
            <span className="font-semibold text-sm text-foreground truncate">
              {agent.name}
            </span>
          </div>
          {statusBadge(agent.status)}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {agent.description || (
            <span className="italic">No description provided.</span>
          )}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-auto">
          <Badge variant="outline" className="text-[10px] px-2.5 py-1 font-mono">
            {agent.model?.model || "no model"}
          </Badge>
          {agent.model?.provider && (
            <Badge variant="secondary" className="text-[10px] px-2.5 py-1">
              {agent.model.provider}
            </Badge>
          )}
          <Badge variant="blue" className="text-[10px] px-2.5 py-1">
            v{agent.version ?? 1}
          </Badge>
          {agent.autonomyLevel && (
            <Badge variant="secondary" className="text-[10px] px-2.5 py-1">
              {agent.autonomyLevel}
            </Badge>
          )}
          {toolCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Wrench className="size-3" aria-hidden="true" />
              {toolCount} tool{toolCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(agent)}
            aria-label={`Edit ${agent.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => onExecute(agent)}
            aria-label={`Execute ${agent.name}`}
          >
            <Play className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(agent)}
            aria-label={`Delete ${agent.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AgentsPanel() {
  const [agents, setAgents] = React.useState<AgentInfo[]>([]);
  const [stats, setStats] = React.useState<AgentStats | null>(null);
  const [loadingAgents, setLoadingAgents] = React.useState(true);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<AgentInfo | null>(null);
  const [createForm, setCreateForm] = React.useState<AgentFormValues>(EMPTY_FORM);
  const [editForm, setEditForm] = React.useState<AgentFormValues>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch on mount
  React.useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        setLoadingAgents(true);
        const data = await listAgents();
        if (!cancelled) setAgents(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    }

    async function fetchStats() {
      try {
        setLoadingStats(true);
        const data = await getStats();
        if (!cancelled) setStats(data);
      } catch {
        // Stats are non-critical; silently ignore
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }

    fetchAll();
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const filteredAgents = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q),
    );
  }, [agents, search]);

  function formToPayload(values: AgentFormValues) {
    const tools = values.tools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const keywords = values.routingKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const examples = values.routingExamples
      .split("\n")
      .map((e) => e.trim())
      .filter(Boolean);
    const threshold = values.routingThreshold ? parseFloat(values.routingThreshold) : undefined;

    return {
      id: values.id || undefined,
      name: values.name,
      description: values.description || undefined,
      model: {
        model: values.model,
        provider: values.provider || undefined,
        routingStrategy: values.modelRoutingStrategy || undefined,
        routingEngine: values.routingEngine || undefined,
        preferredTier: values.preferredTier || undefined,
        requiredCapabilities: values.requiredCapabilities
          ? values.requiredCapabilities.split(",").map((c) => c.trim()).filter(Boolean)
          : undefined,
        maxCostPerRequest: values.maxCostPerRequest ? parseFloat(values.maxCostPerRequest) : undefined,
        fallbackEnabled: values.fallbackEnabled,
      },
      temporal: {
        namespace: values.temporalNamespace || "default",
        taskQueue: values.temporalTaskQueue || "effgen-agents",
      },
      tools: { enabled: tools },
      routing:
        keywords.length || examples.length || threshold
          ? { keywords: keywords.length ? keywords : undefined, examples: examples.length ? examples : undefined, threshold }
          : undefined,
      maxTokens: values.maxTokens ? parseInt(values.maxTokens, 10) : undefined,
      temperature: values.temperature ? parseFloat(values.temperature) : undefined,
      maxIterations: values.maxIterations ? parseInt(values.maxIterations, 10) : undefined,
      maxTokensPerRun: values.maxTokensPerRun ? parseInt(values.maxTokensPerRun, 10) : undefined,
      timeoutSeconds: values.timeoutSeconds ? parseInt(values.timeoutSeconds, 10) : undefined,
      autonomyLevel: values.autonomyLevel || undefined,
    };
  }

  async function handleCreate() {
    try {
      setSaving(true);
      setError(null);
      const payload = formToPayload(createForm);
      const created = await createAgent(payload);
      setAgents((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setCreateForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(agent: AgentInfo) {
    if (!window.confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    try {
      await deleteAgent(agent.id);
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent");
    }
  }

  function handleEdit(agent: AgentInfo) {
    setEditingAgent(agent);
    setEditForm(agentToForm(agent));
    setShowCreateForm(false);
  }

  async function handleSaveEdit() {
    if (!editingAgent) return;
    try {
      setSaving(true);
      setError(null);
      const { id: _id, ...rest } = formToPayload(editForm);
      const updated = await updateAgent(editingAgent.id, rest);
      setAgents((prev) => prev.map((a) => (a.id === editingAgent.id ? updated : a)));
      setEditingAgent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update agent");
    } finally {
      setSaving(false);
    }
  }

  function handleExecute(agent: AgentInfo) {
    // Execute is handled by the Execute tab; this stub surfaces agent context.
    console.info("[AgentsPanel] Execute requested for", agent.id);
  }

  const statItems: StatCardProps[] = [
    {
      label: "Active Agents",
      value: loadingStats ? "—" : (stats?.activeAgents ?? 0),
      dotColor: "bg-success",
      borderColor: "border-l-success",
    },
    {
      label: "Draft Agents",
      value: loadingStats ? "—" : (stats?.draftAgents ?? 0),
      dotColor: "bg-warning",
      borderColor: "border-l-warning",
    },
    {
      label: "Runs (30d)",
      value: loadingStats ? "—" : (stats?.runsLast30Days ?? 0),
      dotColor: "bg-ale-blue",
      borderColor: "border-l-ale-blue",
    },
    {
      label: "Tokens (30d)",
      value: loadingStats
        ? "—"
        : formatNumber(stats?.tokensLast30Days ?? 0),
      dotColor: "bg-ale-indigo",
      borderColor: "border-l-ale-indigo",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-destructive/70 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold text-foreground mr-auto">
          My Agents
        </h2>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search agents…"
            aria-label="Search agents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateForm((v) => !v)}
          aria-expanded={showCreateForm}
        >
          {showCreateForm ? (
            <>
              <X className="size-4" aria-hidden="true" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="size-4" aria-hidden="true" />
              Create Agent
            </>
          )}
        </Button>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <AgentForm
          title="Create Agent"
          icon={<Plus className="size-4 text-primary" aria-hidden="true" />}
          values={createForm}
          onChange={setCreateForm}
          onSubmit={handleCreate}
          onCancel={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); }}
          saving={saving}
          submitLabel="Create"
          submitIcon={<Plus className="size-4" aria-hidden="true" />}
        />
      )}

      {/* Inline edit form */}
      {editingAgent && (
        <AgentForm
          title={`Edit: ${editingAgent.name}`}
          icon={<Pencil className="size-4 text-primary" aria-hidden="true" />}
          values={editForm}
          onChange={setEditForm}
          onSubmit={handleSaveEdit}
          onCancel={() => setEditingAgent(null)}
          saving={saving}
          submitLabel="Save"
          submitIcon={<Pencil className="size-4" aria-hidden="true" />}
          isEdit
        />
      )}

      {/* Agent grid */}
      {loadingAgents ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span className="text-sm">Loading agents…</span>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-muted">
            <Bot className="size-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {search ? "No agents match your search" : "No agents yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? "Try a different keyword."
                : "Create your first agent to get started."}
            </p>
          </div>
          {!search && (
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Create Agent
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onExecute={handleExecute}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
