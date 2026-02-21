// src/app/(app)/programs/calendar/page.tsx

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
    <div className="content-grid animate-fade-in space-y-[var(--density-section-gap)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Session Calendar</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Week of {weekLabel}</p>
        </div>
        <Link
          href="/programs"
          className="text-sm text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
        >
          ← Back to Programs
        </Link>
      </div>

      {/* Navigation + Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-[var(--radius)] border border-[var(--border)] shadow-[var(--shadow-xs)]">
        <div className="flex items-center gap-2">
          <Link
            href={`/programs/calendar?week=${prevWeek}${programFilter ? `&program=${programFilter}` : ""}`}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 h-[var(--density-button-height)] flex items-center text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-overlay)] transition-colors"
          >
            ← Prev
          </Link>
          <Link
            href={`/programs/calendar${programFilter ? `?program=${programFilter}` : ""}`}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 h-[var(--density-button-height)] flex items-center text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-overlay)] transition-colors"
          >
            Today
          </Link>
          <Link
            href={`/programs/calendar?week=${nextWeek}${programFilter ? `&program=${programFilter}` : ""}`}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 h-[var(--density-button-height)] flex items-center text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-overlay)] transition-colors"
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
            className="rounded-[var(--radius-sm)] border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
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
            className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-3 h-[var(--density-button-height)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-overlay)] transition-colors border border-[var(--border)]"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((dateStr, idx) => {
          const daySessions = sessionsByDate.get(dateStr) ?? [];
          const dateObj = new Date(dateStr + "T00:00:00");
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <div
              key={dateStr}
              className={`rounded-[var(--radius)] border p-3 min-h-[160px] flex flex-col transition-all ${
                isToday 
                  ? "border-[var(--primary)] bg-[var(--primary-50)] shadow-[var(--shadow-sm)]" 
                  : "border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-xs)]"
              }`}
            >
              {/* Day header */}
              <div className="mb-3 border-b border-[var(--border)] pb-1.5">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    isToday ? "text-[var(--primary-700)]" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {WEEKDAYS[idx]}
                </p>
                <p
                  className={`text-xl font-bold tabular-nums ${
                    isToday ? "text-[var(--primary-900)]" : "text-[var(--foreground)]"
                  }`}
                >
                  {dateObj.getDate()}
                </p>
              </div>

              {/* Sessions */}
              {daySessions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[10px] font-medium text-[var(--empty-state-icon)] italic">No sessions</p>
                </div>
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
                        className="block rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--background)] p-2 hover:border-[var(--primary-300)] hover:shadow-[var(--shadow-sm)] transition-all group"
                      >
                        <p className="text-[10px] font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] truncate transition-colors">
                          {session.program.name}
                        </p>
                        <p className="text-[9px] font-medium text-[var(--muted-foreground)] tabular-nums">
                          {formatTime(session.start_time)} – {formatTime(session.end_time)}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between border-t border-[var(--border)] pt-1">
                          <span className="text-[9px] font-bold text-[var(--foreground)] tabular-nums">
                            {session.confirmed_count}
                            {capacity != null ? `/${capacity}` : ""}
                          </span>
                          <span
                            className={`status-badge-plain inline-flex rounded-full px-1 py-0.5 text-[8px] font-extrabold uppercase ${statusConfig.badgeBg} ${statusConfig.badgeText}`}
                          >
                            {statusConfig.label[0]}
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