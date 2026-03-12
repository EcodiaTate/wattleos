"use client";

// src/components/domain/naplan/naplan-dashboard-client.tsx
//
// NAPLAN dashboard - list all test windows with summary stats.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { NaplanWindowStatusBadge } from "./naplan-window-status-badge";
import { setWindowStatus, deleteTestWindow } from "@/lib/actions/naplan";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { NAPLAN_WINDOW_STATUS_CONFIG } from "@/lib/constants/naplan";
import type { NaplanDashboardData, NaplanWindowStatus } from "@/types/domain";

interface NaplanDashboardClientProps {
  data: NaplanDashboardData;
  canManage: boolean;
}

export function NaplanDashboardClient({
  data,
  canManage,
}: NaplanDashboardClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(
    windowId: string,
    newStatus: NaplanWindowStatus,
    label: string,
  ) {
    if (
      !confirm(
        `Set this window to "${label}"? This action${newStatus === "closed" ? " cannot be undone" : " can be reversed"}.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await setWindowStatus({ id: windowId, status: newStatus });
      if (!result.error) {
        haptics.success();
        router.refresh();
      } else {
        haptics.error();
        alert(result.error.message);
      }
    });
  }

  function handleDelete(windowId: string, year: number) {
    if (!confirm(`Delete the NAPLAN ${year} window? This cannot be undone.`))
      return;

    startTransition(async () => {
      const result = await deleteTestWindow(windowId);
      if (!result.error) {
        haptics.success();
        router.refresh();
      } else {
        haptics.error();
        alert(result.error.message);
      }
    });
  }

  if (data.windows.length === 0) {
    return (
      <div
        className="rounded-xl border border-border p-10 text-center"
        style={{ background: "var(--card)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No NAPLAN windows yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row (current year) */}
      {data.active_window && (
        <div
          className="grid grid-cols-3 gap-4 rounded-xl border border-border p-5"
          style={{
            background: "var(--naplan-window-active-bg)",
            borderColor: "var(--naplan-window-active)",
          }}
        >
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--naplan-window-active)" }}
            >
              Active Window
            </p>
            <p className="mt-1 text-lg font-bold">
              NAPLAN {data.active_window.collection_year}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              Students in Cohort
            </p>
            <p className="mt-1 text-lg font-bold">
              {data.total_students_this_year}
              {data.total_opted_out_this_year > 0 && (
                <span
                  className="ml-2 text-sm font-normal"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  ({data.total_opted_out_this_year} opted out)
                </span>
              )}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              Results Entered
            </p>
            <p className="mt-1 text-lg font-bold">
              {data.results_completion_pct}%
            </p>
          </div>
        </div>
      )}

      {/* Windows list */}
      <div
        className="overflow-hidden rounded-xl border border-border"
        style={{ background: "var(--card)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b border-border text-left text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 sm:table-cell">Test Dates</th>
              <th className="px-4 py-3">Cohort</th>
              <th className="hidden px-4 py-3 sm:table-cell">Opted Out</th>
              <th className="hidden px-4 py-3 sm:table-cell">Results</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.windows.map((w) => {
              const cfg = NAPLAN_WINDOW_STATUS_CONFIG[w.status];
              return (
                <tr
                  key={w.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold">
                    {w.collection_year}
                  </td>
                  <td className="px-4 py-3">
                    <NaplanWindowStatusBadge status={w.status} />
                  </td>
                  <td
                    className="hidden px-4 py-3 sm:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {w.test_start_date
                      ? new Date(w.test_start_date).toLocaleDateString(
                          "en-AU",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{w.cohort_count}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {w.opted_out_count}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {w.results_total_possible > 0
                      ? `${w.results_entered_count} / ${w.results_total_possible}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/naplan/${w.id}`}
                        className="touch-target active-push rounded-md px-3 py-1.5 text-xs font-medium border border-border"
                        style={{ color: "var(--foreground)" }}
                      >
                        View
                      </Link>
                      {canManage && w.status !== "closed" && (
                        <Link
                          href={`/admin/naplan/${w.id}/results`}
                          className="touch-target active-push rounded-md px-3 py-1.5 text-xs font-medium"
                          style={{
                            background: "var(--naplan-window-active-bg)",
                            color: "var(--naplan-window-active)",
                          }}
                        >
                          Results
                        </Link>
                      )}
                      {canManage && w.status === "draft" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(w.id, "active", "Active")
                            }
                            disabled={isPending}
                            className="touch-target active-push rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                            style={{
                              background: "var(--naplan-window-active-bg)",
                              color: "var(--naplan-window-active)",
                            }}
                          >
                            Activate
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(w.id, w.collection_year)
                            }
                            disabled={isPending}
                            className="touch-target active-push rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                            style={{
                              color: "var(--destructive)",
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {canManage && w.status === "active" && (
                        <button
                          onClick={() =>
                            handleStatusChange(w.id, "closed", "Closed")
                          }
                          disabled={isPending}
                          className="touch-target active-push rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                          style={{
                            background: "var(--naplan-window-closed-bg)",
                            color: "var(--naplan-window-closed-fg)",
                          }}
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
