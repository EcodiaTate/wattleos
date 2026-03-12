"use client";

// src/components/domain/work-cycle/session-list-client.tsx
//
// Filterable list of work cycle sessions with class + date filters.

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { InterruptionSourceBadge } from "./interruption-source-badge";
import { QualityRatingDisplay } from "./quality-rating-display";
import { FLAG_INTERRUPTIONS_THRESHOLD } from "@/lib/constants/work-cycle";
import type { WorkCycleSessionWithDetails } from "@/types/domain";
import type { PaginatedResponse } from "@/types/api";

interface SessionListClientProps {
  result: PaginatedResponse<WorkCycleSessionWithDetails>;
  classes: { id: string; name: string }[];
  canManage: boolean;
}

export function SessionListClient({ result, classes, canManage }: SessionListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set(key, value);
      else p.delete(key);
      p.delete("page");
      return `${pathname}?${p.toString()}`;
    },
    [pathname, searchParams],
  );

  const sessions = result.data ?? [];
  const pagination = result.pagination;
  const page = pagination ? Math.ceil((pagination.total - (pagination.total - (pagination.page ?? 1) * (pagination.per_page ?? 20))) / (pagination.per_page ?? 20)) : 1;

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Class</label>
          <select
            defaultValue={searchParams.get("class_id") ?? ""}
            onChange={(e) => router.push(buildUrl("class_id", e.target.value))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
          <input
            type="date"
            defaultValue={searchParams.get("from_date") ?? ""}
            onChange={(e) => router.push(buildUrl("from_date", e.target.value))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
          <input
            type="date"
            defaultValue={searchParams.get("to_date") ?? ""}
            onChange={(e) => router.push(buildUrl("to_date", e.target.value))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {canManage && (
          <Link
            href="/pedagogy/work-cycles/new"
            className="ml-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary transition-colors"
          >
            Record Session
          </Link>
        )}
      </div>

      {/* List */}
      {sessions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <svg
            className="mx-auto h-10 w-10"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="mt-3 text-sm font-semibold text-foreground">No sessions recorded</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManage ? "Record your first work cycle session." : "No sessions match the current filters."}
          </p>
          {canManage && (
            <Link
              href="/pedagogy/work-cycles/new"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background"
            >
              Record Session
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Class</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Interruptions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Top Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Quality</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Full Cycle</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => {
                const flagged = s.interruption_count > FLAG_INTERRUPTIONS_THRESHOLD;
                const topSource = s.interruptions.reduce(
                  (acc, i) => {
                    acc[i.source] = (acc[i.source] ?? 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                const topSourceKey = Object.entries(topSource).sort((a, b) => b[1] - a[1])[0]?.[0] as
                  | import("@/types/domain").WorkCycleInterruptionSource
                  | undefined;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-muted/30 transition-colors"
                    style={flagged ? { background: "var(--wc-severity-severe-bg)" } : undefined}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{fmtDate(s.session_date)}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{s.class_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-bold"
                        style={{ color: flagged ? "var(--wc-severity-severe-fg)" : "var(--foreground)" }}
                      >
                        {s.interruption_count}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({s.total_interruption_minutes} min)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {topSourceKey ? <InterruptionSourceBadge source={topSourceKey} /> : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <QualityRatingDisplay rating={s.quality_rating} showLabel={false} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.completed_full_cycle ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/pedagogy/work-cycles/${s.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > (pagination.per_page ?? 20) && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {pagination.total} sessions total
          </p>
          <div className="flex gap-2">
            {(pagination.page ?? 1) > 1 && (
              <Link
                href={buildUrl("page", String((pagination.page ?? 1) - 1))}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {(pagination.page ?? 1) * (pagination.per_page ?? 20) < pagination.total && (
              <Link
                href={buildUrl("page", String((pagination.page ?? 1) + 1))}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
