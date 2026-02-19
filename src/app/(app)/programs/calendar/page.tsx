// src/app/(app)/programs/calendar/page.tsx
//
// ============================================================
// WattleOS V2 - Session Calendar Page
// ============================================================
// Displays sessions in a week-by-week grid view across all
// programs. Staff can navigate between weeks and filter by
// program. Links to session detail pages.
//
// WHY week view not month: OSHC programs are weekly patterns.
// A week view shows capacity at a glance without overwhelming
// with a full month of data. Staff need to see "this week's
// sessions" and "next week's sessions".
// ============================================================

import { listPrograms, listSessions } from "@/lib/actions/programs/programs";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { formatTime, SESSION_STATUS_CONFIG } from "@/lib/constants/programs";
import Link from "next/link";
import { redirect } from "next/navigation";

interface CalendarPageProps {
  searchParams: Promise<{
    week?: string;
    program?: string;
  }>;
}

function getWeekBounds(dateStr?: string): { start: string; end: string } {
  const date = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = date.getDay();
  // Start on Monday (day 1). If Sunday (0), go back 6.
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(monday.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function shiftWeek(weekStart: string, direction: number): string {
  const date = new Date(weekStart + "T00:00:00");
  date.setDate(date.getDate() + direction * 7);
  return date.toISOString().split("T")[0];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({
  searchParams,
}: CalendarPageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_PROGRAMS)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const week = getWeekBounds(params.week);
  const programFilter = params.program;

  // Fetch sessions for this week
  const sessionsResult = await listSessions({
    program_id: programFilter,
    from_date: week.start,
    to_date: week.end,
    per_page: 50,
  });

  // Fetch programs for filter dropdown
  const programsResult = await listPrograms({ is_active: true, per_page: 100 });

  const sessions = sessionsResult.data ?? [];
  const programs = programsResult.data ?? [];

  // Group sessions by date
  const sessionsByDate = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const existing = sessionsByDate.get(s.date) ?? [];
    existing.push(s);
    sessionsByDate.set(s.date, existing);
  }

  // Generate dates for the week
  const weekDates: string[] = [];
  const cursor = new Date(week.start + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    weekDates.push(cursor.toISOString().split("T")[0]);
    cursor.setDate(cursor.getDate() + 1);
  }

  const prevWeek = shiftWeek(week.start, -1);
  const nextWeek = shiftWeek(week.start, 1);

  const weekLabel = `${new Date(week.start + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(week.end + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Session Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">Week of {weekLabel}</p>
        </div>
        <Link
          href="/programs"
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          ← Back to Programs
        </Link>
      </div>

      {/* Navigation + Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/programs/calendar?week=${prevWeek}${programFilter ? `&program=${programFilter}` : ""}`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Prev
          </Link>
          <Link
            href={`/programs/calendar${programFilter ? `?program=${programFilter}` : ""}`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            This Week
          </Link>
          <Link
            href={`/programs/calendar?week=${nextWeek}${programFilter ? `&program=${programFilter}` : ""}`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Next →
          </Link>
        </div>

        {/* Program filter */}
        <form className="flex items-center gap-2">
          <input type="hidden" name="week" value={week.start} />
          <select
            name="program"
            defaultValue={programFilter ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((dateStr, idx) => {
          const daySessions = sessionsByDate.get(dateStr) ?? [];
          const dateObj = new Date(dateStr + "T00:00:00");
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <div
              key={dateStr}
              className={`rounded-lg border bg-white p-3 min-h-[140px] ${
                isToday ? "border-amber-300 bg-amber-50/30" : "border-gray-200"
              }`}
            >
              {/* Day header */}
              <div className="mb-2 border-b border-gray-100 pb-1">
                <p
                  className={`text-xs font-medium uppercase ${
                    isToday ? "text-amber-700" : "text-gray-400"
                  }`}
                >
                  {WEEKDAYS[idx]}
                </p>
                <p
                  className={`text-lg font-bold ${
                    isToday ? "text-amber-800" : "text-gray-900"
                  }`}
                >
                  {dateObj.getDate()}
                </p>
              </div>

              {/* Sessions */}
              {daySessions.length === 0 ? (
                <p className="text-xs text-gray-300">No sessions</p>
              ) : (
                <div className="space-y-2">
                  {daySessions.map((session) => {
                    const statusConfig =
                      SESSION_STATUS_CONFIG[session.status] ??
                      SESSION_STATUS_CONFIG.scheduled;
                    const capacity =
                      session.max_capacity ?? session.program.max_capacity;

                    return (
                      <Link
                        key={session.id}
                        href={`/programs/sessions/${session.id}`}
                        className="block rounded-md border border-gray-100 bg-gray-50 p-2 hover:bg-gray-100 transition-colors"
                      >
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {session.program.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatTime(session.start_time)} –{" "}
                          {formatTime(session.end_time)}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">
                            {session.confirmed_count}
                            {capacity != null ? `/${capacity}` : ""}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-1 py-0.5 text-[9px] font-medium ${statusConfig.badgeBg} ${statusConfig.badgeText}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
