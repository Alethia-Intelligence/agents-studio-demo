"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { listPendingApprovals, approveRequest, rejectRequest } from "@/lib/api-client";
import type { ApprovalRequest } from "@/types/api";

// Usage:
// <ApprovalsPanel />

const STATUS_VARIANT: Record<
  ApprovalRequest["status"],
  "warning" | "success" | "destructive" | "secondary"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  expired: "secondary",
};

interface ApprovalCardProps {
  approval: ApprovalRequest;
  processing: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function ApprovalCard({ approval, processing, onApprove, onReject }: ApprovalCardProps) {
  const [argsExpanded, setArgsExpanded] = useState(false);
  const hasArgs =
    approval.toolArgs && Object.keys(approval.toolArgs).length > 0;

  return (
    <Card className="transition-all duration-200">
      <CardContent className="p-5 flex flex-col gap-4">
        {/* Top row: status + title */}
        <div className="flex items-start gap-3">
          <Badge
            variant={STATUS_VARIANT[approval.status]}
            className="shrink-0 mt-0.5"
          >
            {approval.status}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              Tool:{" "}
              <span className="font-mono text-foreground">{approval.toolName}</span>
              {" "}on agent{" "}
              <span className="font-mono text-foreground">{approval.agentId}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">{approval.reason}</p>
          </div>
        </div>

        {/* Tool arguments collapsible */}
        {hasArgs && (
          <div className="rounded-2xl border border-border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setArgsExpanded((v) => !v)}
              aria-expanded={argsExpanded}
              aria-label="Toggle tool arguments"
            >
              <span>Tool Arguments</span>
              {argsExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
            {argsExpanded && (
              <pre className="px-4 py-3 text-xs font-mono bg-muted/40 text-foreground overflow-x-auto leading-relaxed border-t border-border">
                {JSON.stringify(approval.toolArgs, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Created{" "}
            <span className="text-foreground">{timeAgo(approval.createdAt)}</span>
          </span>
          <span>
            Run:{" "}
            <span className="font-mono text-foreground truncate max-w-[120px] inline-block align-bottom">
              {approval.runId}
            </span>
          </span>
          <span>
            Workflow:{" "}
            <span className="font-mono text-foreground truncate max-w-[120px] inline-block align-bottom">
              {approval.workflowId}
            </span>
          </span>
          {approval.expiresAt && (
            <span>
              Expires{" "}
              <span className="text-foreground">{timeAgo(approval.expiresAt)}</span>
            </span>
          )}
        </div>

        {/* Action buttons — only for pending */}
        {approval.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={processing}
              onClick={() => onApprove(approval.id)}
              className={cn(
                "flex-1 bg-success/10 text-success border border-success/30 hover:bg-success/20 rounded-2xl shadow-none",
                processing && "opacity-50 cursor-not-allowed"
              )}
            >
              <CheckCircle className="size-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={processing}
              onClick={() => onReject(approval.id)}
              className={cn(
                "flex-1 text-destructive border-destructive/30 hover:bg-destructive/10",
                processing && "opacity-50 cursor-not-allowed"
              )}
            >
              <XCircle className="size-4" />
              Reject
            </Button>
          </div>
        )}

        {/* Decided state */}
        {approval.status !== "pending" && approval.decidedAt && (
          <p className="text-xs text-muted-foreground">
            {approval.status === "approved" ? "Approved" : "Rejected"} by{" "}
            <span className="text-foreground">{approval.decidedBy ?? "unknown"}</span>{" "}
            {timeAgo(approval.decidedAt)}
            {approval.decision && (
              <span className="block mt-0.5 italic">"{approval.decision}"</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ApprovalsPanel() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listPendingApprovals();
      setApprovals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  function showFeedback(id: string, message: string, type: "success" | "error") {
    setFeedback({ id, message, type });
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleApprove(id: string) {
    setProcessing((s) => new Set(s).add(id));
    try {
      await approveRequest(id, "studio-user");
      showFeedback(id, "Approved successfully", "success");
      await fetchApprovals(true);
    } catch (err) {
      showFeedback(id, err instanceof Error ? err.message : "Approval failed", "error");
    } finally {
      setProcessing((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Rejection reason (optional):");
    if (reason === null) return; // cancelled

    setProcessing((s) => new Set(s).add(id));
    try {
      await rejectRequest(id, reason || undefined);
      showFeedback(id, "Rejected successfully", "success");
      await fetchApprovals(true);
    } catch (err) {
      showFeedback(id, err instanceof Error ? err.message : "Rejection failed", "error");
    } finally {
      setProcessing((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Human-in-the-loop tool authorization
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="warning" className="shrink-0">
              {pendingCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchApprovals(true)}
          disabled={loading || refreshing}
          aria-label="Refresh approvals"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Global feedback toast */}
      {feedback && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm transition-all duration-200",
            feedback.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.message}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card h-36 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && approvals.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <ShieldCheck className="size-10 opacity-30" />
          <p className="text-sm">No pending approvals</p>
        </div>
      )}

      {/* Approvals list */}
      {!loading && approvals.length > 0 && (
        <div className="flex flex-col gap-4">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              processing={processing.has(approval.id)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
