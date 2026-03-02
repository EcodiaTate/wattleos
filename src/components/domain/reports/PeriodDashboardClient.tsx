"use client";

// src/components/domain/reports/PeriodDashboardClient.tsx
//
// ============================================================
// WattleOS V2 - Period Dashboard Client (Admin)
// ============================================================
// Shows the per-guide progress grid and handles bulk-approve
// for submitted instances. Server Component passes the guide
// breakdown; this component handles the interactive parts.
// ============================================================

import {
  bulkApproveInstances,
  listPeriodInstances,
} from "@/lib/actions/reports/instances";
import type { ReportPeriodDashboardData } from "@/types/domain";
import { useTransition, useState } from "react";

interface GuideRow {
  guide_id: string;
  guide_name: string;
  total: number;
  completed: number;
}

interface PeriodDashboardClientProps {
  periodId: string;
  guides: ReportPeriodDashboardData["guides"];
  submittedCount: number;
}

const STATUS_COLOUR: Record<string, string> = {
  not_started: "var(--color-muted-fg)",
  in_progress: "var(--color-info-fg)",
  submitted: "var(--color-warning-fg)",
  changes_requested: "var(--color-warning-fg)",
  approved: "var(--color-success-fg)",
  published: "var(--color-success-fg)",
};

export function PeriodDashboardClient({
  periodId,
  guides,
  submittedCount,
}: PeriodDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    approved?: number;
    error?: string;
  } | null>(null);

  const handleBulkApprove = () => {
    setResult(null);
    startTransition(async () => {
      // Fetch submitted instance IDs, then bulk-approve
      const listResult = await listPeriodInstances(periodId, {
        status: "submitted",
        per_page: 500,
      });

      if (listResult.error || !listResult.data?.length) {
        setResult({ error: listResult.error ?? "No submitted reports found." });
        return;
      }

      const ids = listResult.data.map((i) => i.id);
      const approveResult = await bulkApproveInstances(ids);

      if (approveResult.error) {
        setResult({ error: approveResult.error });
      } else {
        setResult({ approved: approveResult.data ?? 0 });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Bulk approve */}
      {submittedCount > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {submittedCount} report{submittedCount !== 1 ? "s" : ""}{" "}
                awaiting approval
              </p>
              <p className="text-xs text-muted-foreground">
                Approve all submitted reports in one click.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isPending}
              className="touch-target rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "var(--color-success-subtle)",
                color: "var(--color-success-fg)",
              }}
            >
              {isPending ? "Approving…" : `Approve All (${submittedCount})`}
            </button>
          </div>
          {result?.error && (
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-destructive)" }}
            >
              {result.error}
            </p>
          )}
          {result?.approved !== undefined && (
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-success-fg)" }}
            >
              {result.approved} report{result.approved !== 1 ? "s" : ""}{" "}
              approved.
            </p>
          )}
        </div>
      )}

      {/* Guide breakdown */}
      {guides.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Progress by Guide
          </h2>
          <div className="space-y-3">
            {guides.map((guide) => {
              const pct =
                guide.total > 0
                  ? Math.round((guide.completed / guide.total) * 100)
                  : 0;
              return (
                <div key={guide.guide_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{guide.guide_name}</span>
                    <span className="text-muted-foreground">
                      {guide.completed}/{guide.total}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--color-muted)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct === 100
                            ? "var(--color-success)"
                            : "var(--color-info)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {guides.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            No guides assigned yet. Generate instances and assign guides to see
            progress here.
          </p>
        </div>
      )}
    </div>
  );
}
