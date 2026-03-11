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

// ─── Create form ──────────────────────────────────────────────────────────────

interface CreateFormValues {
  id: string;
  name: string;
  description: string;
  modelPath: string;
  modelSize: string;
  systemPrompt: string;
}

const EMPTY_FORM: CreateFormValues = {
  id: "",
  name: "",
  description: "",
  modelPath: "",
  modelSize: "7b",
  systemPrompt: "",
};

interface CreateAgentFormProps {
  onCancel: () => void;
  onCreate: (values: CreateFormValues) => Promise<void>;
  saving: boolean;
}

function CreateAgentForm({ onCancel, onCreate, saving }: CreateAgentFormProps) {
  const [values, setValues] = React.useState<CreateFormValues>(EMPTY_FORM);

  function set(field: keyof CreateFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreate(values);
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow";

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <Card className="border-primary/30 shadow-glow-blue mb-6 animate-scale-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="size-4 text-primary" aria-hidden="true" />
          New Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* ID */}
            <div>
              <label htmlFor="cf-id" className={labelCls}>
                Agent ID <span className="text-destructive">*</span>
              </label>
              <input
                id="cf-id"
                className={inputCls}
                placeholder="e.g. my-agent"
                value={values.id}
                onChange={(e) => set("id", e.target.value)}
                required
                disabled={saving}
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="cf-name" className={labelCls}>
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="cf-name"
                className={inputCls}
                placeholder="e.g. Research Agent"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                required
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label htmlFor="cf-desc" className={labelCls}>
                Description
              </label>
              <input
                id="cf-desc"
                className={inputCls}
                placeholder="What does this agent do?"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                disabled={saving}
              />
            </div>

            {/* Model Path */}
            <div>
              <label htmlFor="cf-model-path" className={labelCls}>
                Model Path
              </label>
              <input
                id="cf-model-path"
                className={inputCls}
                placeholder="e.g. models/phi3.gguf"
                value={values.modelPath}
                onChange={(e) => set("modelPath", e.target.value)}
                disabled={saving}
              />
            </div>

            {/* Model Size */}
            <div>
              <label htmlFor="cf-model-size" className={labelCls}>
                Model Size
              </label>
              <select
                id="cf-model-size"
                className={cn(inputCls, "cursor-pointer")}
                value={values.modelSize}
                onChange={(e) => set("modelSize", e.target.value)}
                disabled={saving}
              >
                <option value="1b">1B</option>
                <option value="3b">3B</option>
                <option value="7b">7B</option>
                <option value="13b">13B</option>
                <option value="34b">34B</option>
                <option value="70b">70B</option>
              </select>
            </div>

            {/* System Prompt */}
            <div className="sm:col-span-2">
              <label htmlFor="cf-system-prompt" className={labelCls}>
                System Prompt
              </label>
              <textarea
                id="cf-system-prompt"
                className={cn(inputCls, "min-h-[88px] resize-y")}
                placeholder="Optional system prompt for this agent…"
                value={values.systemPrompt}
                onChange={(e) => set("systemPrompt", e.target.value)}
                disabled={saving}
              />
            </div>
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
              disabled={saving || !values.id || !values.name}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              {saving ? "Creating…" : "Create Agent"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Edit form ───────────────────────────────────────────────────────────────

interface EditAgentFormProps {
  agent: AgentInfo;
  onCancel: () => void;
  onSave: (id: string, values: CreateFormValues) => Promise<void>;
  saving: boolean;
}

function EditAgentForm({ agent, onCancel, onSave, saving }: EditAgentFormProps) {
  const [values, setValues] = React.useState<CreateFormValues>({
    id: agent.id,
    name: agent.name,
    description: agent.description ?? "",
    modelPath: agent.model?.path ?? "",
    modelSize: agent.model?.size ?? "7b",
    systemPrompt: "",
  });

  function set(field: keyof CreateFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(agent.id, values);
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow";

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <Card className="border-primary/30 shadow-glow-blue mb-6 animate-scale-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="size-4 text-primary" aria-hidden="true" />
          Edit Agent — {agent.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="ef-name" className={labelCls}>
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="ef-name"
                className={inputCls}
                placeholder="e.g. Research Agent"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="ef-model-size" className={labelCls}>
                Model Size
              </label>
              <select
                id="ef-model-size"
                className={cn(inputCls, "cursor-pointer")}
                value={values.modelSize}
                onChange={(e) => set("modelSize", e.target.value)}
                disabled={saving}
              >
                <option value="1b">1B</option>
                <option value="3b">3B</option>
                <option value="7b">7B</option>
                <option value="13b">13B</option>
                <option value="34b">34B</option>
                <option value="70b">70B</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="ef-desc" className={labelCls}>
                Description
              </label>
              <input
                id="ef-desc"
                className={inputCls}
                placeholder="What does this agent do?"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="ef-model-path" className={labelCls}>
                Model Path
              </label>
              <input
                id="ef-model-path"
                className={inputCls}
                placeholder="e.g. models/phi3.gguf"
                value={values.modelPath}
                onChange={(e) => set("modelPath", e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="ef-system-prompt" className={labelCls}>
                System Prompt
              </label>
              <textarea
                id="ef-system-prompt"
                className={cn(inputCls, "min-h-[88px] resize-y")}
                placeholder="Optional system prompt for this agent…"
                value={values.systemPrompt}
                onChange={(e) => set("systemPrompt", e.target.value)}
                disabled={saving}
              />
            </div>
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
              disabled={saving || !values.name}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Pencil className="size-4" aria-hidden="true" />
              )}
              {saving ? "Saving…" : "Save Changes"}
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
          <Badge variant="outline" className="text-[10px] px-2.5 py-1">
            {agent.model?.size
              ? `${agent.model.size.toUpperCase()} model`
              : "model"}
          </Badge>
          <Badge variant="blue" className="text-[10px] px-2.5 py-1">
            v{agent.version ?? 1}
          </Badge>
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

  async function handleCreate(values: CreateFormValues) {
    try {
      setSaving(true);
      setError(null);
      const created = await createAgent({
        id: values.id,
        name: values.name,
        description: values.description,
        model: { path: values.modelPath, size: values.modelSize },
        temporal: { namespace: "default", taskQueue: "effgen-agents" },
        tools: { enabled: [] },
        ...(values.systemPrompt
          ? { systemPrompt: values.systemPrompt } as Record<string, unknown>
          : {}),
      });
      setAgents((prev) => [created, ...prev]);
      setShowCreateForm(false);
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
    setShowCreateForm(false);
  }

  async function handleSaveEdit(id: string, values: CreateFormValues) {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateAgent(id, {
        name: values.name,
        description: values.description,
        model: { path: values.modelPath, size: values.modelSize },
        ...(values.systemPrompt
          ? { systemPrompt: values.systemPrompt } as Record<string, unknown>
          : {}),
      });
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
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
        <CreateAgentForm
          onCancel={() => setShowCreateForm(false)}
          onCreate={handleCreate}
          saving={saving}
        />
      )}

      {/* Inline edit form */}
      {editingAgent && (
        <EditAgentForm
          agent={editingAgent}
          onCancel={() => setEditingAgent(null)}
          onSave={handleSaveEdit}
          saving={saving}
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
