"use client";

import Link from "next/link";
import type { RosterDashboardData } from "@/types/domain";
import { RosterWeekStatusBadge } from "./roster-week-status-badge";
import { LEAVE_TYPE_CONFIG } from "@/lib/constants/rostering";
import type { LeaveType } from "@/types/domain";

export function RosterDashboardClient({
  data,
  canManage,
}: {
  data: RosterDashboardData;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Action bar */}
      {canManage && (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/rostering/week/new"
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            + New Roster Week
          </Link>
          <Link
            href="/admin/rostering/templates"
            className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Templates
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Shifts This Week" value={data.this_week_shift_count} />
        <StatCard label="Total Hours" value={data.this_week_total_hours.toFixed(1)} />
        <StatCard
          label="Pending Leave"
          value={data.pending_leave_count}
          href={canManage ? "/admin/rostering/leave" : undefined}
          highlight={data.pending_leave_count > 0}
        />
        <StatCard
          label="Open Coverage"
          value={data.open_coverage_count}
          href={canManage ? "/admin/rostering/coverage" : undefined}
          highlight={data.open_coverage_count > 0}
        />
      </div>

      {/* Current & Next week */}
      <div className="grid gap-4 sm:grid-cols-2">
        <WeekCard
          title="Current Week"
          week={data.current_week}
          canManage={canManage}
        />
        <WeekCard
          title="Next Week"
          week={data.next_week}
          canManage={canManage}
        />
      </div>

      {/* Staff on leave today */}
      {data.staff_on_leave_today.length > 0 && (
        <div
          className="rounded-xl border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Staff on Leave Today
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.staff_on_leave_today.map((s) => (
              <span
                key={s.user_id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
              >
                <span>{LEAVE_TYPE_CONFIG[s.leave_type as LeaveType]?.emoji ?? "📋"}</span>
                {s.user_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      {canManage && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/rostering/swaps" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
            Swap Requests{data.pending_swap_count > 0 ? ` (${data.pending_swap_count})` : ""}
          </Link>
          <span style={{ color: "var(--muted-foreground)" }}>·</span>
          <Link href="/admin/rostering/availability" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
            Staff Availability
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number | string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold"
        style={{ color: highlight ? "var(--destructive)" : "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function WeekCard({
  title,
  week,
  canManage,
}: {
  title: string;
  week: RosterDashboardData["current_week"];
  canManage: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {title}
        </h3>
        {week && <RosterWeekStatusBadge status={week.status} />}
      </div>
      {week ? (
        <div className="mt-2">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Week of {week.week_start_date}
          </p>
          {canManage && (
            <Link
              href={`/admin/rostering/week/${week.id}`}
              className="mt-2 inline-block text-sm underline-offset-2 hover:underline"
              style={{ color: "var(--primary)" }}
            >
              View / Edit →
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          No roster created yet
        </p>
      )}
    </div>
  );
}
