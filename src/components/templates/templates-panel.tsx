"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Bot,
  Brain,
  Building2,
  Shield,
  CheckCircle2,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listTemplates,
  createFromTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/api-client";
import type { AgentTemplate, AgentInfo } from "@/types/api";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "General", value: "general" },
  { label: "Intelligence", value: "intelligence" },
  { label: "Enterprise", value: "enterprise" },
  { label: "Insurance", value: "insurance" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  general: <Bot className="size-6" />,
  intelligence: <Brain className="size-6" />,
  enterprise: <Building2 className="size-6" />,
  insurance: <Shield className="size-6" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-ale-blue/10 text-ale-blue",
  intelligence: "bg-ale-indigo/10 text-ale-indigo",
  enterprise: "bg-ale-magenta/10 text-ale-magenta",
  insurance: "bg-ale-orange/10 text-ale-orange",
};

const COMPLEXITY_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  simple: "success",
  medium: "warning",
  advanced: "destructive",
};

const AUTONOMY_OPTIONS = ["supervised", "semi-autonomous", "autonomous"];
const COMPLEXITY_OPTIONS = ["simple", "medium", "advanced"];

interface CreationForm {
  templateId: string;
  agentId: string;
  name: string;
  description: string;
}

interface CreatedResult {
  templateId: string;
  agent: AgentInfo;
}

interface TemplateFormState {
  name: string;
  description: string;
  category: string;
  complexity: string;
  autonomyLevel: string;
  tools: string;
  maxIterations: number;
  maxTokensPerRun: number;
  timeoutSeconds: number;
  model: string;
  provider: string;
  modelRoutingStrategy: string;
  routingEngine: string;
  preferredTier: string;
  requiredCapabilities: string;
  maxCostPerRequest: string;
  fallbackEnabled: boolean;
  temporalNamespace: string;
  temporalTaskQueue: string;
  routingKeywords: string;
  routingExamples: string;
  routingThreshold: string;
  systemPrompt: string;
  tags: string;
}

const INITIAL_TEMPLATE_FORM: TemplateFormState = {
  name: "",
  description: "",
  category: "general",
  complexity: "simple",
  autonomyLevel: "supervised",
  tools: "",
  maxIterations: 5,
  maxTokensPerRun: 4096,
  timeoutSeconds: 300,
  model: "",
  provider: "",
  modelRoutingStrategy: "",
  routingEngine: "",
  preferredTier: "",
  requiredCapabilities: "",
  maxCostPerRequest: "",
  fallbackEnabled: true,
  temporalNamespace: "default",
  temporalTaskQueue: "",
  routingKeywords: "",
  routingExamples: "",
  routingThreshold: "",
  systemPrompt: "",
  tags: "",
};

export function TemplatesPanel() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<CreationForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit template state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(INITIAL_TEMPLATE_FORM);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  async function fetchTemplates() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates(selectedCategory || undefined);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function openForm(template: AgentTemplate) {
    setCreatedResult(null);
    setActiveForm({
      templateId: template.id,
      agentId: template.id,
      name: template.name,
      description: template.description,
    });
  }

  function closeForm() {
    setActiveForm(null);
    setCreatedResult(null);
  }

  async function handleCreate() {
    if (!activeForm) return;
    setCreating(true);
    setError(null);
    try {
      const agent = await createFromTemplate(activeForm.templateId, {
        id: activeForm.agentId || undefined,
        name: activeForm.name || undefined,
        description: activeForm.description || undefined,
      });
      setCreatedResult({ templateId: activeForm.templateId, agent });
      setActiveForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm(INITIAL_TEMPLATE_FORM);
    setShowCreateForm(true);
  }

  function openEditTemplate(template: AgentTemplate) {
    setShowCreateForm(false);
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      category: template.category,
      complexity: template.complexity,
      autonomyLevel: template.autonomyLevel ?? "supervised",
      tools: template.tools.enabled.join(", "),
      maxIterations: template.maxIterations ?? 5,
      maxTokensPerRun: template.maxTokensPerRun ?? 4096,
      timeoutSeconds: template.timeoutSeconds ?? 300,
      model: template.model.model,
      provider: template.model.provider ?? "",
      modelRoutingStrategy: template.model.routingStrategy ?? "",
      routingEngine: template.model.routingEngine ?? "",
      preferredTier: template.model.preferredTier ?? "",
      requiredCapabilities: template.model.requiredCapabilities?.join(", ") ?? "",
      maxCostPerRequest: template.model.maxCostPerRequest?.toString() ?? "",
      fallbackEnabled: template.model.fallbackEnabled ?? true,
      temporalNamespace: template.temporal.namespace,
      temporalTaskQueue: template.temporal.taskQueue,
      routingKeywords: template.routing?.keywords?.join(", ") ?? "",
      routingExamples: template.routing?.examples?.join("\n") ?? "",
      routingThreshold: template.routing?.threshold?.toString() ?? "",
      systemPrompt: template.systemPrompt ?? "",
      tags: template.tags?.join(", ") ?? "",
    });
  }

  function closeTemplateForm() {
    setShowCreateForm(false);
    setEditingTemplate(null);
    setTemplateForm(INITIAL_TEMPLATE_FORM);
  }

  function buildTemplatePayload(): Partial<AgentTemplate> {
    const keywords = templateForm.routingKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    const examples = templateForm.routingExamples.split("\n").map((e) => e.trim()).filter(Boolean);
    const tags = templateForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const threshold = templateForm.routingThreshold.trim() ? parseFloat(templateForm.routingThreshold) : undefined;

    return {
      name: templateForm.name.trim(),
      description: templateForm.description.trim(),
      category: templateForm.category,
      complexity: templateForm.complexity,
      autonomyLevel: templateForm.autonomyLevel,
      temporal: {
        namespace: templateForm.temporalNamespace.trim() || "default",
        taskQueue: templateForm.temporalTaskQueue.trim(),
      },
      model: {
        model: templateForm.model.trim(),
        provider: templateForm.provider.trim() || undefined,
        routingStrategy: templateForm.modelRoutingStrategy.trim() || undefined,
        routingEngine: templateForm.routingEngine.trim() || undefined,
        preferredTier: templateForm.preferredTier.trim() || undefined,
        requiredCapabilities: templateForm.requiredCapabilities
          ? templateForm.requiredCapabilities.split(",").map((c) => c.trim()).filter(Boolean)
          : undefined,
        maxCostPerRequest: templateForm.maxCostPerRequest ? parseFloat(templateForm.maxCostPerRequest) : undefined,
        fallbackEnabled: templateForm.fallbackEnabled,
      },
      tools: {
        enabled: templateForm.tools.split(",").map((t) => t.trim()).filter(Boolean),
      },
      routing: keywords.length > 0 ? { keywords, examples: examples.length > 0 ? examples : undefined, threshold } : undefined,
      maxIterations: templateForm.maxIterations,
      maxTokensPerRun: templateForm.maxTokensPerRun,
      timeoutSeconds: templateForm.timeoutSeconds,
      systemPrompt: templateForm.systemPrompt.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
  }

  async function handleSaveTemplate() {
    if (!templateForm.name.trim()) return;
    setSavingTemplate(true);
    setError(null);
    try {
      if (editingTemplate) {
        const updated = await updateTemplate(editingTemplate.id, buildTemplatePayload());
        setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? updated : t)));
      } else {
        const created = await createTemplate(buildTemplatePayload());
        setTemplates((prev) => [...prev, created]);
      }
      closeTemplateForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(template: AgentTemplate) {
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    try {
      await deleteTemplate(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      if (editingTemplate?.id === template.id) closeTemplateForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  const isFormOpen = showCreateForm || !!editingTemplate;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Agent Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Browse pre-built templates or create your own</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => (isFormOpen ? closeTemplateForm() : openCreateTemplate())}>
          {isFormOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {isFormOpen ? "Cancel" : "New Template"}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setSelectedCategory(cat.value);
              setActiveForm(null);
              setCreatedResult(null);
            }}
            className={cn(
              "px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200 border",
              selectedCategory === cat.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-foreground border-input hover:bg-muted"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Create / Edit Template Form */}
      {isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {editingTemplate ? (
                <>
                  <Pencil className="size-4 text-primary" />
                  Edit Template — {editingTemplate.name}
                </>
              ) : (
                <>
                  <Plus className="size-4 text-primary" />
                  New Template
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            {/* Basic Info */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Basic Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="My Template"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, category: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="What does this template do?"
                  rows={2}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Complexity</label>
                <select
                  value={templateForm.complexity}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, complexity: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  {COMPLEXITY_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Autonomy Level</label>
                <select
                  value={templateForm.autonomyLevel}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, autonomyLevel: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  {AUTONOMY_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={templateForm.tags}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, tags: e.target.value }))}
                  placeholder="research, analysis, automation"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
            </div>

            {/* Model & Execution */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">Model & Execution</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Model</label>
                <input
                  type="text"
                  value={templateForm.model}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, model: e.target.value }))}
                  placeholder="e.g. gpt-4o-mini, claude-3-5-sonnet-20241022"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Provider</label>
                <select
                  value={templateForm.provider}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, provider: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="">Auto (AI Proxy)</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Routing Strategy</label>
                <select
                  value={templateForm.modelRoutingStrategy}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, modelRoutingStrategy: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="auto">Auto (balanced)</option>
                  <option value="cost_optimized">Cost Optimized</option>
                  <option value="quality_optimized">Quality Optimized</option>
                  <option value="speed_optimized">Speed Optimized</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Routing Engine</label>
                <select
                  value={templateForm.routingEngine}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, routingEngine: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="">Auto</option>
                  <option value="heuristic">Heuristic (rule-based)</option>
                  <option value="functiongemma">FunctionGemma (ML-based)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Preferred Tier</label>
                <select
                  value={templateForm.preferredTier}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, preferredTier: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <option value="">Any tier</option>
                  <option value="free">Free</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Required Capabilities</label>
                <input
                  type="text"
                  value={templateForm.requiredCapabilities}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, requiredCapabilities: e.target.value }))}
                  placeholder="chat, code, vision, function_calling"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max Cost / Request (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={templateForm.maxCostPerRequest}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, maxCostPerRequest: e.target.value }))}
                  placeholder="0.05"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateForm.fallbackEnabled}
                    onChange={(e) => setTemplateForm((s) => ({ ...s, fallbackEnabled: e.target.checked }))}
                    className="size-4 rounded border-border accent-primary"
                  />
                  Allow model fallback
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max Iterations</label>
                <input
                  type="number"
                  value={templateForm.maxIterations}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, maxIterations: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={50}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max Tokens per Run</label>
                <input
                  type="number"
                  value={templateForm.maxTokensPerRun}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, maxTokensPerRun: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Timeout (seconds)</label>
                <input
                  type="number"
                  value={templateForm.timeoutSeconds}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, timeoutSeconds: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">System Prompt</label>
                <textarea
                  value={templateForm.systemPrompt}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, systemPrompt: e.target.value }))}
                  placeholder="You are an AI agent that..."
                  rows={3}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all resize-y"
                />
              </div>
            </div>

            {/* Temporal & Routing */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">Temporal & Routing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Temporal Namespace</label>
                <input
                  type="text"
                  value={templateForm.temporalNamespace}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, temporalNamespace: e.target.value }))}
                  placeholder="default"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Temporal Task Queue</label>
                <input
                  type="text"
                  value={templateForm.temporalTaskQueue}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, temporalTaskQueue: e.target.value }))}
                  placeholder="agent-tasks"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Routing Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={templateForm.routingKeywords}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, routingKeywords: e.target.value }))}
                  placeholder="analyze, research, summarize"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Routing Threshold</label>
                <input
                  type="text"
                  value={templateForm.routingThreshold}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, routingThreshold: e.target.value }))}
                  placeholder="e.g. 0.8"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Routing Examples (one per line)</label>
                <textarea
                  value={templateForm.routingExamples}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, routingExamples: e.target.value }))}
                  placeholder={"Analyze the quarterly report\nSummarize this article"}
                  rows={2}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all resize-none"
                />
              </div>
            </div>

            {/* Tools */}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">Tools</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Enabled Tools (comma-separated)</label>
                <input
                  type="text"
                  value={templateForm.tools}
                  onChange={(e) => setTemplateForm((s) => ({ ...s, tools: e.target.value }))}
                  placeholder="web_search, db_query, send_email"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={closeTemplateForm} disabled={savingTemplate}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveTemplate} disabled={savingTemplate || !templateForm.name.trim()}>
                {savingTemplate ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTemplate ? (
                  <>
                    <Pencil className="size-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create Template
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <Bot className="size-10 opacity-30" />
          <p className="text-sm">No templates found for this category.</p>
        </div>
      )}

      {/* Template grid */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const isActive = activeForm?.templateId === template.id;
            const isCreated = createdResult?.templateId === template.id;
            const categoryKey = template.category?.toLowerCase() ?? "general";
            const iconColor = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS.general;

            return (
              <Card
                key={template.id}
                className={cn(
                  "flex flex-col transition-all duration-200",
                  isActive && "ring-2 ring-primary"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center size-10 rounded-full shrink-0",
                        iconColor
                      )}
                    >
                      {CATEGORY_ICONS[categoryKey] ?? <Bot className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3 mt-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={COMPLEXITY_VARIANT[template.complexity?.toLowerCase()] ?? "secondary"}>
                      {template.complexity}
                    </Badge>
                    <Badge variant="outline">{template.autonomyLevel}</Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wrench className="size-3.5 shrink-0" />
                    <span>
                      {template.tools.enabled.length} tool{template.tools.enabled.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {isCreated && createdResult && (
                    <div className="rounded-2xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>
                        Agent <span className="font-mono font-semibold">{createdResult.agent.id}</span> created
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-0">
                  {/* Action buttons */}
                  <div className="w-full flex items-center gap-1 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditTemplate(template)}
                      aria-label={`Edit ${template.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {!isActive && !isCreated && (
                      <Button size="sm" className="flex-1" onClick={() => openForm(template)}>
                        Use Template
                      </Button>
                    )}
                    {isCreated && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCreatedResult(null);
                          openForm(template);
                        }}
                      >
                        Use Again
                      </Button>
                    )}
                    {isActive && !isCreated && <div className="flex-1" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteTemplate(template)}
                      aria-label={`Delete ${template.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Inline creation form (Use Template) */}
                  {isActive && activeForm && (
                    <div className="w-full flex flex-col gap-3">
                      <div className="h-px bg-border" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Configure Agent
                      </p>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-muted-foreground">Agent ID</label>
                        <input
                          type="text"
                          value={activeForm.agentId}
                          onChange={(e) =>
                            setActiveForm((f) => (f ? { ...f, agentId: e.target.value } : f))
                          }
                          placeholder="agent-id"
                          className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-muted-foreground">Name (optional)</label>
                        <input
                          type="text"
                          value={activeForm.name}
                          onChange={(e) =>
                            setActiveForm((f) => (f ? { ...f, name: e.target.value } : f))
                          }
                          placeholder="Override name..."
                          className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-muted-foreground">Description (optional)</label>
                        <textarea
                          value={activeForm.description}
                          onChange={(e) =>
                            setActiveForm((f) => (f ? { ...f, description: e.target.value } : f))
                          }
                          placeholder="Override description..."
                          rows={2}
                          className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>

                      {error && <p className="text-xs text-destructive">{error}</p>}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleCreate}
                          disabled={creating || !activeForm.agentId.trim()}
                        >
                          {creating ? "Creating..." : "Create Agent"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={closeForm} disabled={creating}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
