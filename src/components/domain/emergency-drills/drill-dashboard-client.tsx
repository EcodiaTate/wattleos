"use client";

import Link from "next/link";
import type {
  DrillComplianceSummary,
  EmergencyDrillDashboardData,
} from "@/types/domain";
import { ComplianceStatusBadge } from "./compliance-status-badge";
import { DrillCard } from "./drill-card";

const DRILL_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
};

const DRILL_TYPE_EMOJI: Record<string, string> = {
  fire_evacuation: "\u{1F525}",
  lockdown: "\u{1F512}",
  shelter_in_place: "\u{1F3E0}",
  medical_emergency: "\u{1FA7A}",
};

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface DrillDashboardClientProps {
  data: EmergencyDrillDashboardData;
  canManage: boolean;
}

function ComplianceCard({ item }: { item: DrillComplianceSummary }) {
  const label = DRILL_TYPE_LABELS[item.drill_type] ?? item.drill_type;
  const emoji = DRILL_TYPE_EMOJI[item.drill_type] ?? "\u{1F514}";

  const statusToken = item.is_overdue
    ? "overdue"
    : item.is_at_risk
      ? "at-risk"
      : "compliant";

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {label}
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            background: `var(--drill-${statusToken})`,
            color: `var(--drill-${statusToken}-fg)`,
          }}
        >
          {item.is_overdue
            ? "Overdue"
            : item.is_at_risk
              ? "At Risk"
              : "OK"}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>Last drill</span>
          <span
            className="font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {item.last_drill_date
              ? new Date(item.last_drill_date + "T00:00:00").toLocaleDateString(
                  "en-AU",
                  { day: "numeric", month: "short", year: "numeric" },
                )
              : "Never"}
          </span>
        </div>
        <div className="flex items-baseline justify-between text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>Days ago</span>
          <span
            className="font-medium"
            style={{
              color:
                item.is_overdue
                  ? "var(--drill-overdue)"
                  : item.is_at_risk
                    ? "var(--drill-at-risk)"
                    : "var(--foreground)",
            }}
          >
            {item.days_since_last !== null ? `${item.days_since_last}d` : "-"}
          </span>
        </div>
        <div className="flex items-baseline justify-between text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>This year</span>
          <span
            className="font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {item.drills_this_year}
          </span>
        </div>
        {item.average_evacuation_seconds != null && (
          <div className="flex items-baseline justify-between text-xs">
            <span style={{ color: "var(--muted-foreground)" }}>Avg. time</span>
            <span
              className="font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {formatSeconds(item.average_evacuation_seconds)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DrillDashboardClient({
  data,
  canManage,
}: DrillDashboardClientProps) {
  const maxMonthly = Math.max(...data.monthly_counts.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Overall status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ComplianceStatusBadge status={data.overall_status} />
          <span
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {data.total_this_year} drill{data.total_this_year !== 1 ? "s" : ""}{" "}
            this year
            {data.follow_ups_pending > 0 && (
              <span style={{ color: "var(--drill-at-risk)" }}>
                {" "}
                \u00b7 {data.follow_ups_pending} follow-up
                {data.follow_ups_pending !== 1 ? "s" : ""} pending
              </span>
            )}
          </span>
        </div>
        {canManage && (
          <Link
            href="/admin/emergency-drills/new"
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Schedule Drill
          </Link>
        )}
      </div>

      {/* Compliance cards per type */}
      <div>
        <h2
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Compliance by Type
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.compliance_by_type.map((item) => (
            <ComplianceCard key={item.drill_type} item={item} />
          ))}
        </div>
      </div>

      {/* Monthly frequency chart */}
      <div
        className="rounded-[var(--radius-lg)] border border-border p-4"
        style={{ background: "var(--card)" }}
      >
        <h2
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Monthly Drill Frequency
        </h2>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {data.monthly_counts.map((m) => (
            <div
              key={m.month}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max((m.count / maxMonthly) * 60, m.count > 0 ? 4 : 0)}px`,
                  background:
                    m.count > 0
                      ? "var(--drill-completed)"
                      : "var(--muted)",
                  minHeight: m.count > 0 ? 4 : 0,
                }}
              />
              <span
                className="text-[9px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {m.month.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming scheduled */}
      {data.next_scheduled.length > 0 && (
        <div>
          <h2
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Upcoming Scheduled
          </h2>
          <div className="space-y-3">
            {data.next_scheduled.map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>
        </div>
      )}

      {/* Recent drills */}
      {data.recent_drills.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Recent Drills
            </h2>
            <Link
              href="/admin/emergency-drills/history"
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.recent_drills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.recent_drills.length === 0 && data.next_scheduled.length === 0 && (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No emergency drills recorded yet.
          </p>
          {canManage && (
            <Link
              href="/admin/emergency-drills/new"
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              Schedule your first drill
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
