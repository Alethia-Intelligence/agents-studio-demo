"use client";

import { useState, useEffect } from "react";
import { Wrench, Bot, Brain, Building2, Shield, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listTemplates, createFromTemplate } from "@/lib/api-client";
import type { AgentTemplate, AgentInfo } from "@/types/api";

// Usage:
// <TemplatesPanel />

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

export function TemplatesPanel() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<CreationForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Agent Templates</h2>
        <p className="text-sm text-muted-foreground mt-1">Browse pre-built templates</p>
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
                    {/* Icon circle */}
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
                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={COMPLEXITY_VARIANT[template.complexity?.toLowerCase()] ?? "secondary"}>
                      {template.complexity}
                    </Badge>
                    <Badge variant="outline">{template.autonomyLevel}</Badge>
                  </div>

                  {/* Tools count */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wrench className="size-3.5 shrink-0" />
                    <span>
                      {template.tools.length} tool{template.tools.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Success message */}
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
                  {!isActive && !isCreated && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openForm(template)}
                    >
                      Use Template
                    </Button>
                  )}

                  {isCreated && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setCreatedResult(null);
                        openForm(template);
                      }}
                    >
                      Use Again
                    </Button>
                  )}

                  {/* Inline creation form */}
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
                            setActiveForm((f) => f ? { ...f, agentId: e.target.value } : f)
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
                            setActiveForm((f) => f ? { ...f, name: e.target.value } : f)
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
                            setActiveForm((f) => f ? { ...f, description: e.target.value } : f)
                          }
                          placeholder="Override description..."
                          rows={2}
                          className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>

                      {error && (
                        <p className="text-xs text-destructive">{error}</p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleCreate}
                          disabled={creating || !activeForm.agentId.trim()}
                        >
                          {creating ? "Creating..." : "Create Agent"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={closeForm}
                          disabled={creating}
                        >
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
