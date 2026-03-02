"use client";

// src/components/domain/reports/PeriodInstanceListClient.tsx
//
// ============================================================
// WattleOS V2 - Period Instance List (Admin Client)
// ============================================================
// Shows all instances for a period. Handles bulk approve
// and bulk publish. Each row links to the instance review page.
// ============================================================

import {
  bulkApproveInstances,
  bulkPublishInstances,
} from "@/lib/actions/reports/instances";
import type { ReportInstance, ReportInstanceStatus } from "@/types/domain";
import Link from "next/link";
import { useState, useTransition } from "react";

const STATUS_LABEL: Record<ReportInstanceStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
};

const STATUS_STYLE: Record<ReportInstanceStatus, React.CSSProperties> = {
  not_started: {
    background: "var(--color-muted)",
    color: "var(--color-muted-fg)",
  },
  in_progress: {
    background: "color-mix(in srgb, var(--color-info) 12%, transparent)",
    color: "var(--color-info-fg)",
  },
  submitted: {
    background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
    color: "var(--color-warning-fg)",
  },
  changes_requested: {
    background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
    color: "var(--color-warning-fg)",
  },
  approved: {
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
    color: "var(--color-success-fg)",
  },
  published: {
    background: "color-mix(in srgb, var(--color-success) 20%, transparent)",
    color: "var(--color-success-fg)",
  },
};

interface Props {
  periodId: string;
  instances: ReportInstance[];
  statusFilter: ReportInstanceStatus | undefined;
}

export function PeriodInstanceListClient({
  periodId,
  instances,
  statusFilter,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [localInstances, setLocalInstances] = useState(instances);

  const submittedIds = localInstances
    .filter((i) => i.status === "submitted")
    .map((i) => i.id);

  const approvedIds = localInstances
    .filter((i) => i.status === "approved")
    .map((i) => i.id);

  function handleBulkApprove() {
    if (!submittedIds.length) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await bulkApproveInstances(submittedIds);
      if (result.error) {
        setFeedback({ type: "error", message: result.error.message });
      } else {
        setFeedback({
          type: "success",
          message: `${result.data?.approved ?? 0} reports approved.`,
        });
        setLocalInstances((prev) =>
          prev.map((i) =>
            submittedIds.includes(i.id) ? { ...i, status: "approved" } : i,
          ),
        );
      }
    });
  }

  function handleBulkPublish() {
    if (!approvedIds.length) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await bulkPublishInstances(approvedIds);
      if (result.error) {
        setFeedback({ type: "error", message: result.error.message });
      } else {
        const { published, errors } = result.data ?? {
          published: 0,
          errors: 0,
        };
        setFeedback({
          type: errors > 0 ? "error" : "success",
          message: `${published} published${errors > 0 ? `, ${errors} failed` : ""}.`,
        });
        setLocalInstances((prev) =>
          prev.map((i) =>
            approvedIds.includes(i.id) ? { ...i, status: "published" } : i,
          ),
        );
      }
    });
  }

  // Filter client-side based on status filter URL param
  const displayed = statusFilter
    ? localInstances.filter((i) => i.status === statusFilter)
    : localInstances;

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {(submittedIds.length > 0 || approvedIds.length > 0) && !statusFilter && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
          <p className="flex-1 text-sm text-muted-foreground">
            {submittedIds.length > 0 && (
              <span className="font-medium text-foreground">
                {submittedIds.length} submitted
              </span>
            )}
            {submittedIds.length > 0 && approvedIds.length > 0 && " · "}
            {approvedIds.length > 0 && (
              <span className="font-medium text-foreground">
                {approvedIds.length} approved
              </span>
            )}
          </p>
          {submittedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{
                background:
                  "color-mix(in srgb, var(--color-success) 15%, transparent)",
                color: "var(--color-success-fg)",
              }}
            >
              {isPending ? "Working…" : `Approve all (${submittedIds.length})`}
            </button>
          )}
          {approvedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkPublish}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground)",
              }}
            >
              {isPending
                ? "Working…"
                : `Publish all + PDF (${approvedIds.length})`}
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className="rounded-lg border px-4 py-3 text-sm font-medium"
          style={{
            borderColor:
              feedback.type === "success"
                ? "var(--color-success)"
                : "var(--color-destructive)",
            color:
              feedback.type === "success"
                ? "var(--color-success-fg)"
                : "var(--color-destructive)",
            background:
              feedback.type === "success"
                ? "color-mix(in srgb, var(--color-success) 10%, transparent)"
                : "color-mix(in srgb, var(--color-destructive) 10%, transparent)",
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Instance rows */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {statusFilter
              ? `No reports with status "${statusFilter.replace(/_/g, " ")}".`
              : "No report instances yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((instance) => {
            const studentName =
              [
                instance.student_preferred_name ?? instance.student_first_name,
                instance.student_last_name,
              ]
                .filter(Boolean)
                .join(" ") || "Unknown Student";

            const status = instance.status as ReportInstanceStatus;

            return (
              <Link
                key={instance.id}
                href={`/reports/periods/${periodId}/instances/${instance.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground truncate">
                      {studentName}
                    </p>
                    <span
                      className="shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={STATUS_STYLE[status]}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {instance.class_name && <span>{instance.class_name}</span>}
                    {instance.assigned_guide_name && (
                      <span>Guide: {instance.assigned_guide_name}</span>
                    )}
                  </div>
                </div>
                <span className="ml-4 shrink-0 text-xs font-medium text-primary">
                  Review →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
