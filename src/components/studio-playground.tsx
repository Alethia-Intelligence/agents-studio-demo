"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Image from "next/image";
import {
  Bot,
  Play,
  Wrench,
  LayoutTemplate,
  ShieldCheck,
  Server,
  User,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AgentsPanel from "@/components/agents/agents-panel";
import { ExecutePanel } from "@/components/agents/execute-panel";
import { ToolsPanel } from "@/components/tools/tools-panel";
import { TemplatesPanel } from "@/components/templates/templates-panel";
import { ApprovalsPanel } from "@/components/approvals/approvals-panel";
import { MCPPanel } from "@/components/mcp/mcp-panel";

const TABS = [
  { value: "agents", label: "Agents", Icon: Bot },
  { value: "execute", label: "Execute", Icon: Play },
  { value: "tools", label: "Tools", Icon: Wrench },
  { value: "templates", label: "Templates", Icon: LayoutTemplate },
  { value: "approvals", label: "Approvals", Icon: ShieldCheck },
  { value: "mcp", label: "MCP", Icon: Server },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function StudioPlayground() {
  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabValue>("agents");

  // Hydration guard — prevents SSR/client mismatch with Radix
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabValue)}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/alethia-logo.svg"
              alt="Alethia"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold text-foreground">
              Agents Studio
            </h1>
            <Badge variant="indigo">Demo</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Andrei.Pop@alethiaintel.com</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => { window.location.href = '/auth/logout'; }}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-7xl px-4">
          <Tabs.List className="flex gap-1 border-b border-transparent">
            {TABS.map(({ value, label, Icon }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-t-xl",
                  "border-b-2 -mb-[2px]",
                  activeTab === value
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
      </header>

      {/* Tab panels */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-background">
          <Tabs.Content
            value="agents"
            className="h-full outline-none animate-fade-in-up"
          >
            <AgentsPanel />
          </Tabs.Content>

          <Tabs.Content
            value="execute"
            className="h-full outline-none animate-fade-in-up"
          >
            <ExecutePanel />
          </Tabs.Content>

          <Tabs.Content
            value="tools"
            className="h-full outline-none animate-fade-in-up"
          >
            <ToolsPanel />
          </Tabs.Content>

          <Tabs.Content
            value="templates"
            className="h-full outline-none animate-fade-in-up"
          >
            <TemplatesPanel />
          </Tabs.Content>

          <Tabs.Content
            value="approvals"
            className="h-full outline-none animate-fade-in-up"
          >
            <ApprovalsPanel />
          </Tabs.Content>

          <Tabs.Content
            value="mcp"
            className="h-full outline-none animate-fade-in-up"
          >
            <MCPPanel />
          </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
