"use client";

// src/components/domain/work-cycle/dashboard-client.tsx
//
// Dashboard overview: per-class summaries, term stats, trend bars.

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { InterruptionSourceBadge } from "./interruption-source-badge";
import { FLAG_INTERRUPTIONS_THRESHOLD, INTERRUPTION_SOURCE_CONFIG } from "@/lib/constants/work-cycle";
import type { WorkCycleDashboardData, WorkCycleInterruptionSource } from "@/types/domain";

interface DashboardClientProps {
  data: WorkCycleDashboardData;
  classes: { id: string; name: string }[];
  selectedClassId: string | null;
  canManage: boolean;
}

export function WorkCycleDashboardClient({
  data,
  classes,
  selectedClassId,
  canManage,
}: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set(key, value);
      else p.delete(key);
      return `${pathname}?${p.toString()}`;
    },
    [pathname, searchParams],
  );

  const sources = Object.entries(data.interruption_by_source ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [WorkCycleInterruptionSource, number][];

  const maxSource = sources[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Work Cycle Integrity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and analyse interruptions to the 3-hour Montessori work cycle
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pedagogy/work-cycles/sessions"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            All Sessions
          </Link>
          {canManage && (
            <Link
              href="/pedagogy/work-cycles/new"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary transition-colors"
            >
              Record Session
            </Link>
          )}
        </div>
      </div>

      {/* Class filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={buildUrl("class", "")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !selectedClassId
              ? "bg-primary/15 text-primary"
              : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          All Classes
        </Link>
        {classes.map((c) => (
          <Link
            key={c.id}
            href={buildUrl("class", c.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedClassId === c.id
                ? "bg-primary/15 text-primary"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Flagged alert */}
      {data.flagged_class_count > 0 && (
        <div
          className="rounded-lg border px-4 py-3 text-sm font-medium"
          style={{
            borderColor: "var(--wc-severity-severe-bg)",
            background: "var(--wc-severity-severe-bg)",
            color: "var(--wc-severity-severe-fg)",
          }}
        >
          {data.flagged_class_count} class{data.flagged_class_count !== 1 ? "es" : ""} averaging more than {FLAG_INTERRUPTIONS_THRESHOLD} interruptions per session. Review below.
        </div>
      )}

      {/* Term stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Sessions (last 90d)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{data.total_sessions_this_term}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Avg Interruptions / Session</p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{
              color:
                data.avg_interruptions_per_session > FLAG_INTERRUPTIONS_THRESHOLD
                  ? "var(--wc-quality-low)"
                  : "var(--foreground)",
            }}
          >
            {data.avg_interruptions_per_session.toFixed(1)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Avg Quality Rating</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {data.avg_quality_rating !== null ? data.avg_quality_rating.toFixed(1) : "—"}
            {data.avg_quality_rating !== null && <span className="text-sm font-normal text-muted-foreground">/5</span>}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Full Cycle Rate</p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{
              color:
                data.pct_completed_full >= 70
                  ? "var(--wc-quality-high)"
                  : data.pct_completed_full >= 40
                    ? "var(--wc-quality-mid)"
                    : "var(--wc-quality-low)",
            }}
          >
            {data.pct_completed_full.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.pct_preventable.toFixed(0)}% of intrs preventable
          </p>
        </div>
      </div>

      {/* Class summaries + source breakdown side-by-side */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Class table */}
        <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">By Class (last 30 days)</h2>
          </div>
          {data.class_summaries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No sessions recorded in the last 30 days.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Class</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Sessions</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Avg Intrs</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Quality</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Top Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.class_summaries.map((cs) => (
                  <tr
                    key={cs.class_id}
                    className="hover:bg-muted/30 transition-colors"
                    style={cs.flagged ? { background: "var(--wc-severity-severe-bg)" } : undefined}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-medium"
                        style={{ color: cs.flagged ? "var(--wc-severity-severe-fg)" : "var(--foreground)" }}
                      >
                        {cs.flagged && "⚠ "}
                        {cs.class_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{cs.sessions_last_30d}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-semibold"
                        style={{
                          color: cs.flagged ? "var(--wc-severity-severe-fg)" : cs.avg_interruptions_per_session > FLAG_INTERRUPTIONS_THRESHOLD ? "var(--wc-quality-low)" : "var(--foreground)",
                        }}
                      >
                        {cs.avg_interruptions_per_session.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {cs.avg_quality_rating !== null ? `${cs.avg_quality_rating.toFixed(1)}/5` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {cs.most_common_source ? (
                        <InterruptionSourceBadge source={cs.most_common_source} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Source breakdown */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Interruption Sources</h2>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interruptions this term.</p>
          ) : (
            <div className="space-y-3">
              {sources.map(([source, count]) => {
                const cfg = INTERRUPTION_SOURCE_CONFIG[source];
                const pct = maxSource > 0 ? (count / maxSource) * 100 : 0;
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{cfg.label}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: cfg.fgVar,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      {data.recent_sessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Recent Sessions</h2>
            <Link href="/pedagogy/work-cycles/sessions" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recent_sessions.map((s) => {
              const flagged = s.interruption_count > FLAG_INTERRUPTIONS_THRESHOLD;
              return (
                <Link
                  key={s.id}
                  href={`/pedagogy/work-cycles/${s.id}`}
                  className="block rounded-xl border p-4 hover:bg-muted/20 transition-colors"
                  style={{
                    borderColor: flagged ? "var(--wc-severity-severe-bg)" : "var(--border)",
                    background: flagged ? "var(--wc-severity-severe-bg)" : "var(--card)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: flagged ? "var(--wc-severity-severe-fg)" : "var(--foreground)" }}
                      >
                        {s.class_name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: flagged ? "var(--wc-severity-severe-fg)" : "var(--muted-foreground)" }}
                      >
                        {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold rounded-full px-2 py-0.5"
                      style={
                        flagged
                          ? { background: "rgba(0,0,0,0.15)", color: "var(--wc-severity-severe-fg)" }
                          : { background: "var(--muted)", color: "var(--muted-foreground)" }
                      }
                    >
                      {s.interruption_count} intrs
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{s.total_interruption_minutes} min lost</span>
                    {s.quality_rating !== null && (
                      <span>★ {s.quality_rating}/5</span>
                    )}
                    {s.completed_full_cycle && (
                      <span className="text-green-600 dark:text-green-400">Full cycle</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
