"use client";

import Link from "next/link";
import type { MyScheduleData, ShiftWithDetails, ShiftRole } from "@/types/domain";
import { ShiftRoleBadge } from "./shift-role-badge";
import { WEEKDAY_LABELS, getWeekDates, getWeekStartDate } from "@/lib/constants/rostering";

export function MyScheduleClient({ data }: { data: MyScheduleData }) {
  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStartDate(today);
  const weekDates = getWeekDates(weekStart);

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/my-schedule/leave"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Request Leave
          {data.pending_leave_requests.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>
              {data.pending_leave_requests.length}
            </span>
          )}
        </Link>
        <Link
          href="/my-schedule/availability"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          My Availability
        </Link>
        <Link
          href="/my-schedule/swaps"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Shift Swaps
          {data.pending_swap_requests.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>
              {data.pending_swap_requests.length}
            </span>
          )}
        </Link>
        <Link
          href="/my-schedule/coverage"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Available Shifts
          {data.available_coverage_requests.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
              {data.available_coverage_requests.length}
            </span>
          )}
        </Link>
      </div>

      {/* This Week */}
      <WeekSection title="This Week" shifts={data.shifts_this_week} weekDates={weekDates} today={today} />

      {/* Next Week */}
      {data.shifts_next_week.length > 0 && (
        <WeekSection title="Next Week" shifts={data.shifts_next_week} />
      )}
    </div>
  );
}

function WeekSection({
  title,
  shifts,
  weekDates,
  today,
}: {
  title: string;
  shifts: ShiftWithDetails[];
  weekDates?: string[];
  today?: string;
}) {
  const totalHours = shifts.reduce((sum, s) => sum + s.expected_hours, 0);

  return (
    <div className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {title}
        </h2>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {shifts.length} shift{shifts.length !== 1 ? "s" : ""} · {totalHours.toFixed(1)}h
        </span>
      </div>

      {shifts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No shifts scheduled.</p>
      ) : (
        <div className="space-y-1.5">
          {shifts.map((shift) => {
            const isToday = shift.date === today;
            return (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: isToday ? "var(--primary)" : "var(--border)",
                  backgroundColor: isToday ? "var(--primary-muted)" : "transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>
                    {formatShortDate(shift.date)}
                  </span>
                  <ShiftRoleBadge role={shift.shift_role as ShiftRole} />
                  {shift.class_name && (
                    <span style={{ color: "var(--muted-foreground)" }}>{shift.class_name}</span>
                  )}
                  {shift.covers_for_name && (
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      (covering for {shift.covers_for_name})
                    </span>
                  )}
                </div>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {shift.start_time}–{shift.end_time} ({shift.expected_hours}h)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${labels[day]} ${d.getDate()}/${d.getMonth() + 1}`;
}
