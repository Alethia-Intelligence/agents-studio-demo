"use client";

// Usage:
// import { ToolsPanel } from "@/components/tools/tools-panel";
// <ToolsPanel />

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn, formatDuration } from "@/lib/utils";
import { listTools, invokeTool, createTool, updateTool, deleteTool } from "@/lib/api-client";
import type { ToolDefinition, ToolInvocationResult } from "@/types/api";

// ---------- helpers ----------

type CategoryVariant = "blue" | "indigo" | "outline" | "magenta" | "orange";
const CATEGORY_VARIANT: Record<string, CategoryVariant> = {
  search: "blue",
  analysis: "indigo",
  utility: "outline",
  mcp: "magenta",
  custom: "orange",
};

type TypeVariant = "secondary" | "magenta" | "orange";
const TYPE_VARIANT: Record<string, TypeVariant> = {
  builtin: "secondary",
  mcp: "magenta",
  custom: "orange",
};

function categoryVariant(c: string): CategoryVariant {
  return CATEGORY_VARIANT[c.toLowerCase()] ?? "outline";
}

function typeVariant(t: string): TypeVariant {
  return TYPE_VARIANT[t.toLowerCase()] ?? "secondary";
}

// ---------- sub-components ----------

interface InvocationState {
  args: string;
  loading: boolean;
  result: ToolInvocationResult | null;
  error: string | null;
}

function ToolCard({
  tool,
  active,
  onActivate,
  onDeactivate,
  onEdit,
  onDelete,
}: {
  tool: ToolDefinition;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [invocation, setInvocation] = useState<InvocationState>({
    args: "{}",
    loading: false,
    result: null,
    error: null,
  });

  async function handleInvoke() {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(invocation.args);
    } catch {
      setInvocation((s) => ({ ...s, error: "Invalid JSON arguments" }));
      return;
    }

    setInvocation((s) => ({ ...s, loading: true, result: null, error: null }));
    try {
      const result = await invokeTool(tool.name, parsed);
      setInvocation((s) => ({ ...s, result, loading: false }));
    } catch (err) {
      setInvocation((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Invocation failed",
      }));
    }
  }

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-200",
        active && "ring-1 ring-primary/50"
      )}
    >
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-mono text-sm leading-snug">{tool.name}</CardTitle>
          {!tool.enabled && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              disabled
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2 text-xs mt-1">
          {tool.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex flex-col gap-3 flex-1">
        {/* Category + Type */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={categoryVariant(tool.category)} className="capitalize text-[11px]">
            {tool.category}
          </Badge>
          <Badge variant={typeVariant(tool.type)} className="capitalize text-[11px]">
            {tool.type}
          </Badge>
          {tool.requiresApproval && (
            <Badge variant="warning" className="text-[11px] gap-1">
              <AlertTriangle className="size-3" />
              Requires Approval
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-1 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0" aria-label={`Edit ${tool.name}`}>
            <Pencil className="size-3.5" />
          </Button>
          {!active ? (
            <Button variant="outline" size="sm" onClick={onActivate} className="flex-1">
              <PlayCircle className="size-4" />
              Try It
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeactivate}
              className="flex-1 text-muted-foreground"
            >
              <X className="size-4" />
              Close
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label={`Delete ${tool.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {/* Inline invocation form */}
        {active && (
          <div className="flex flex-col gap-2 pt-2 border-t border-input">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Arguments (JSON)
            </label>
            <textarea
              value={invocation.args}
              onChange={(e) => setInvocation((s) => ({ ...s, args: e.target.value }))}
              rows={4}
              spellCheck={false}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all resize-y"
            />
            <Button
              size="sm"
              onClick={handleInvoke}
              disabled={invocation.loading}
              className="w-full"
            >
              {invocation.loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Invoking...
                </>
              ) : (
                <>
                  <PlayCircle className="size-4" />
                  Invoke
                </>
              )}
            </Button>

            {invocation.error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <XCircle className="size-4 mt-0.5 shrink-0" />
                {invocation.error}
              </div>
            )}

            {invocation.result && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {invocation.result.success ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                    <Badge variant={invocation.result.success ? "success" : "destructive"}>
                      {invocation.result.success ? "Success" : "Error"}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDuration(invocation.result.executionTimeMs)}
                  </span>
                </div>
                <pre className="rounded-xl bg-muted px-3 py-2 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                  {invocation.result.output || invocation.result.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CreateFormState {
  name: string;
  description: string;
  category: string;
  type: "builtin" | "mcp" | "custom";
}

const INITIAL_CREATE: CreateFormState = {
  name: "",
  description: "",
  category: "utility",
  type: "custom",
};

// ---------- main panel ----------

export function ToolsPanel() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE);
  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null);
  const [editForm, setEditForm] = useState<CreateFormState>(INITIAL_CREATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listTools()
      .then(setTools)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [tools, search]);

  async function handleCreate() {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const created = await createTool({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        type: createForm.type,
        requiresApproval: false,
        enabled: true,
      });
      setTools((prev) => [...prev, created]);
      setCreateForm(INITIAL_CREATE);
      setCreateOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tool: ToolDefinition) {
    if (!window.confirm(`Delete tool "${tool.name}"? This cannot be undone.`)) return;
    try {
      await deleteTool(tool.name);
      setTools((prev) => prev.filter((t) => t.name !== tool.name));
    } catch (err) {
      console.error(err);
    }
  }

  function handleEdit(tool: ToolDefinition) {
    setEditingTool(tool);
    setEditForm({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      type: tool.type,
    });
    setCreateOpen(false);
  }

  async function handleSaveEdit() {
    if (!editingTool) return;
    setSaving(true);
    try {
      const updated = await updateTool(editingTool.name, {
        description: editForm.description,
        category: editForm.category,
        type: editForm.type,
      });
      setTools((prev) => prev.map((t) => (t.name === editingTool.name ? updated : t)));
      setEditingTool(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Tool Registry</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="h-10 w-full rounded-2xl border border-input bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen((v) => !v)}
          >
            {createOpen ? <X className="size-4" /> : <Plus className="size-4" />}
            {createOpen ? "Cancel" : "Create Tool"}
          </Button>
        </div>
      </div>

      {/* Create Tool Form */}
      {createOpen && (
        <Card className="border-primary/30">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">New Tool</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="my_tool"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="What does this tool do?"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((s) => ({ ...s, category: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="utility">Utility</option>
                  <option value="search">Search</option>
                  <option value="analysis">Analysis</option>
                  <option value="mcp">MCP</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      type: e.target.value as CreateFormState["type"],
                    }))
                  }
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="custom">Custom</option>
                  <option value="builtin">Builtin</option>
                  <option value="mcp">MCP</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateForm(INITIAL_CREATE);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !createForm.name.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Tool Form */}
      {editingTool && (
        <Card className="border-primary/30 shadow-glow-blue animate-scale-in">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pencil className="size-4 text-primary" />
              Edit Tool — {editingTool.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="What does this tool do?"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((s) => ({ ...s, category: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="utility">Utility</option>
                  <option value="search">Search</option>
                  <option value="analysis">Analysis</option>
                  <option value="mcp">MCP</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((s) => ({ ...s, type: e.target.value as CreateFormState["type"] }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="custom">Custom</option>
                  <option value="builtin">Builtin</option>
                  <option value="mcp">MCP</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditingTool(null)} disabled={saving}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Pencil className="size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input py-16 gap-2">
          <p className="text-sm text-muted-foreground">
            {search ? `No tools matching "${search}"` : "No tools registered"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tool) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              active={activeToolName === tool.name}
              onActivate={() => setActiveToolName(tool.name)}
              onDeactivate={() => setActiveToolName(null)}
              onEdit={() => handleEdit(tool)}
              onDelete={() => handleDelete(tool)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
