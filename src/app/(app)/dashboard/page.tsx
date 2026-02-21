// src/app/(app)/dashboard/page.tsx
//
// ============================================================
// WattleOS V2 - Dashboard Page (Real-Time Statistics)
// ============================================================
// Server Component. Fetches live stats via getDashboardStats()
// which runs permission-gated parallel queries. Each section
// only renders if the user has the relevant permission AND
// data was returned.
//
// WHY server component: All data fetching on the server, zero
// client JS for the dashboard. Stats are fresh on every load.
// Permission checks happen server-side via getTenantContext().
// ============================================================

import { getDashboardStats } from "@/lib/actions/dashboard";
import type {
  AttendanceStats,
  BillingStats,
  MasteryStats,
  ObservationStats,
  AdmissionsStats,
  TimesheetStats,
  StudentStats,
} from "@/lib/actions/dashboard";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";

// ============================================================
// Page
// ============================================================

export default async function DashboardPage() {
  const context = await getTenantContext();
  const greeting = getTimeGreeting();

  // Fetch all stats in one call (internally parallelized + permission-gated)
  const statsResult = await getDashboardStats();
  const stats = statsResult.data;

  // Collect which quick actions this user can see
  const actions = buildQuickActions(context);

  return (
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      {/* ── Welcome Header ── */}
      <div className="animate-fade-in-down">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}
          {context.user.first_name ? `, ${context.user.first_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.tenant.name} &middot; {context.role.name}
        </p>
      </div>

      {/* ── Quick Actions ── */}
      {actions.length > 0 && (
        <section aria-label="Quick actions">
          <div className="grid gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((action) => (
              <QuickActionCard key={action.href} {...action} />
            ))}
          </div>
        </section>
      )}

      {/* ── Today at a Glance — Real Stats ── */}
      {stats && (
        <section aria-label="Today at a glance">
          <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-foreground">
                Today at a Glance
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone:
                    context.tenant.timezone ?? "Australia/Brisbane",
                }).format(new Date())}
              </p>
            </div>

            {/* Top-level KPI row */}
            <div className="grid gap-[var(--density-md)] sm:grid-cols-2 lg:grid-cols-4">
              {/* Attendance KPI */}
              {stats.attendance && (
                <KpiCard
                  label="Attendance"
                  value={`${stats.attendance.attendanceRate}%`}
                  sublabel={`${stats.attendance.present + stats.attendance.late + stats.attendance.halfDay} of ${stats.attendance.totalExpected} students`}
                  href="/attendance"
                  colorVar="--attendance-present"
                  alert={
                    !stats.attendance.rollComplete
                      ? `${stats.attendance.unmarked} unmarked`
                      : undefined
                  }
                />
              )}

              {/* Observations KPI */}
              {stats.observations && (
                <KpiCard
                  label="Observations"
                  value={String(stats.observations.thisWeekTotal)}
                  sublabel={`this week (${stats.observations.thisWeekMine} mine)`}
                  href="/pedagogy/observations"
                  colorVar="--curriculum-area"
                  trend={computeTrend(
                    stats.observations.thisWeekTotal,
                    stats.observations.lastWeekTotal,
                  )}
                />
              )}

              {/* Students KPI */}
              {stats.students && (
                <KpiCard
                  label="Active Students"
                  value={String(stats.students.totalActive)}
                  sublabel={
                    stats.students.enrolledThisMonth > 0
                      ? `+${stats.students.enrolledThisMonth} this month`
                      : "enrolled"
                  }
                  href="/students"
                  colorVar="--curriculum-outcome"
                />
              )}

              {/* Mastery KPI */}
              {stats.mastery && (
                <KpiCard
                  label="Mastery Rate"
                  value={`${stats.mastery.masteryRate}%`}
                  sublabel={`${stats.mastery.newMasteriesThisWeek} new this week`}
                  href="/pedagogy/mastery"
                  colorVar="--mastery-mastered"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Detailed Sections (permission-gated) ── */}
      <div className="grid gap-[var(--density-section-gap)] lg:grid-cols-2">
        {/* Attendance Detail */}
        {stats?.attendance && (
          <AttendanceDetailCard attendance={stats.attendance} />
        )}

        {/* Observation Detail */}
        {stats?.observations && (
          <ObservationDetailCard observations={stats.observations} />
        )}

        {/* Mastery Breakdown */}
        {stats?.mastery && <MasteryDetailCard mastery={stats.mastery} />}

        {/* Billing Summary (admin only) */}
        {stats?.billing && <BillingDetailCard billing={stats.billing} />}

        {/* Admissions Pipeline */}
        {stats?.admissions && (
          <AdmissionsDetailCard admissions={stats.admissions} />
        )}

        {/* Timesheets Pending */}
        {stats?.timesheets && stats.timesheets.pendingApproval > 0 && (
          <TimesheetAlertCard timesheets={stats.timesheets} />
        )}
      </div>

      {/* ── Fallback for no-stats roles (e.g. newly created roles) ── */}
      {stats &&
        !stats.attendance &&
        !stats.observations &&
        !stats.mastery &&
        !stats.students && (
          <section
            aria-label="Getting started"
            className="rounded-xl border border-dashed border-border bg-muted/30 p-[var(--density-card-padding)]"
          >
            <h2 className="text-sm font-semibold text-foreground">
              Your Montessori Toolkit
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-prose">
              WattleOS brings your observations, curriculum, mastery tracking,
              and student records together in one place. Use the quick actions
              above to jump into your daily workflow, or explore the sidebar to
              discover all available tools.
            </p>
          </section>
        )}
    </div>
  );
}

// ============================================================
// Detail Cards
// ============================================================

function AttendanceDetailCard({
  attendance,
}: {
  attendance: AttendanceStats;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Attendance Breakdown
        </h3>
        <Link
          href="/attendance"
          className="text-xs font-medium text-primary hover:underline"
        >
          View full roll →
        </Link>
      </div>

      {/* Status bar visualization */}
      {attendance.totalExpected > 0 && (
        <div className="mb-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {attendance.present > 0 && (
              <div
                className="bg-[var(--attendance-present)] transition-all"
                style={{
                  width: `${(attendance.present / attendance.totalExpected) * 100}%`,
                }}
                title={`Present: ${attendance.present}`}
              />
            )}
            {attendance.late > 0 && (
              <div
                className="bg-[var(--attendance-late)] transition-all"
                style={{
                  width: `${(attendance.late / attendance.totalExpected) * 100}%`,
                }}
                title={`Late: ${attendance.late}`}
              />
            )}
            {attendance.halfDay > 0 && (
              <div
                className="bg-[var(--attendance-half-day,hsl(200,60%,55%))] transition-all"
                style={{
                  width: `${(attendance.halfDay / attendance.totalExpected) * 100}%`,
                }}
                title={`Half day: ${attendance.halfDay}`}
              />
            )}
            {attendance.excused > 0 && (
              <div
                className="bg-[var(--attendance-excused)] transition-all"
                style={{
                  width: `${(attendance.excused / attendance.totalExpected) * 100}%`,
                }}
                title={`Excused: ${attendance.excused}`}
              />
            )}
            {attendance.absent > 0 && (
              <div
                className="bg-[var(--attendance-absent)] transition-all"
                style={{
                  width: `${(attendance.absent / attendance.totalExpected) * 100}%`,
                }}
                title={`Absent: ${attendance.absent}`}
              />
            )}
            {attendance.unmarked > 0 && (
              <div
                className="bg-muted-foreground/20 transition-all"
                style={{
                  width: `${(attendance.unmarked / attendance.totalExpected) * 100}%`,
                }}
                title={`Unmarked: ${attendance.unmarked}`}
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <MiniStat
          label="Present"
          value={attendance.present}
          colorClass="text-green-700 dark:text-green-400"
        />
        <MiniStat
          label="Late"
          value={attendance.late}
          colorClass="text-amber-700 dark:text-amber-400"
        />
        <MiniStat
          label="Half Day"
          value={attendance.halfDay}
          colorClass="text-blue-700 dark:text-blue-400"
        />
        <MiniStat
          label="Excused"
          value={attendance.excused}
          colorClass="text-sky-700 dark:text-sky-400"
        />
        <MiniStat
          label="Absent"
          value={attendance.absent}
          colorClass="text-red-700 dark:text-red-400"
        />
        <MiniStat
          label="Unmarked"
          value={attendance.unmarked}
          colorClass={
            attendance.unmarked > 0
              ? "text-orange-600 dark:text-orange-400"
              : "text-muted-foreground"
          }
        />
      </div>

      {/* Roll completion alert */}
      {!attendance.rollComplete && attendance.totalExpected > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <span>
            {attendance.unmarked} student
            {attendance.unmarked !== 1 ? "s" : ""} not yet marked.{" "}
            <Link href="/attendance" className="underline hover:no-underline">
              Complete the roll
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

function ObservationDetailCard({
  observations,
}: {
  observations: ObservationStats;
}) {
  const trend = computeTrend(
    observations.thisWeekTotal,
    observations.lastWeekTotal,
  );

  return (
    <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Observations This Week
        </h3>
        <Link
          href="/pedagogy/observations"
          className="text-xs font-medium text-primary hover:underline"
        >
          View feed →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {observations.thisWeekTotal}
          </p>
          <p className="text-xs text-muted-foreground">Total this week</p>
          {trend && (
            <p
              className={`text-xs font-medium ${trend.isUp ? "text-[var(--stat-trend-up)]" : trend.isDown ? "text-[var(--stat-trend-down)]" : "text-[var(--stat-trend-neutral)]"}`}
            >
              {trend.label} vs last week
            </p>
          )}
        </div>
        <MiniStat
          label="Mine"
          value={observations.thisWeekMine}
          colorClass="text-foreground"
        />
        <MiniStat
          label="Published"
          value={observations.thisWeekPublished}
          colorClass="text-green-700 dark:text-green-400"
        />
        <MiniStat
          label="Drafts"
          value={observations.thisWeekDrafts}
          colorClass="text-amber-700 dark:text-amber-400"
        />
      </div>
    </div>
  );
}

function MasteryDetailCard({ mastery }: { mastery: MasteryStats }) {
  const total = mastery.totalMasteryRecords;
  const segments = [
    {
      label: "Mastered",
      count: mastery.byStatus.mastered,
      colorClass: "bg-[var(--mastery-mastered)]",
    },
    {
      label: "Practicing",
      count: mastery.byStatus.practicing,
      colorClass: "bg-[var(--mastery-practicing)]",
    },
    {
      label: "Presented",
      count: mastery.byStatus.presented,
      colorClass: "bg-[var(--mastery-presented)]",
    },
    {
      label: "Not Started",
      count: mastery.byStatus.not_started,
      colorClass: "bg-[var(--mastery-not-started,hsl(0,0%,85%))]",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Mastery Overview
        </h3>
        <Link
          href="/pedagogy/mastery"
          className="text-xs font-medium text-primary hover:underline"
        >
          View details →
        </Link>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {segments.map(
              (seg) =>
                seg.count > 0 && (
                  <div
                    key={seg.label}
                    className={`${seg.colorClass} transition-all`}
                    style={{ width: `${(seg.count / total) * 100}%` }}
                    title={`${seg.label}: ${seg.count}`}
                  />
                ),
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((seg) => (
          <div key={seg.label} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${seg.colorClass}`} />
              <p className="text-xs text-muted-foreground">{seg.label}</p>
            </div>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {seg.count}
            </p>
            {total > 0 && (
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {Math.round((seg.count / total) * 100)}%
              </p>
            )}
          </div>
        ))}
      </div>

      {mastery.newMasteriesThisWeek > 0 && (
        <p className="mt-3 text-xs text-green-700 dark:text-green-400">
          {mastery.newMasteriesThisWeek} new mastery achievement
          {mastery.newMasteriesThisWeek !== 1 ? "s" : ""} this week
        </p>
      )}
    </div>
  );
}

function BillingDetailCard({ billing }: { billing: BillingStats }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: billing.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Billing Summary
        </h3>
        <Link
          href="/admin/billing"
          className="text-xs font-medium text-primary hover:underline"
        >
          Manage billing →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-0.5">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(billing.outstandingCents)}
          </p>
          <p className="text-xs text-muted-foreground">Outstanding</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">
            {formatCurrency(billing.collectedThisMonthCents)}
          </p>
          <p className="text-xs text-muted-foreground">Collected this month</p>
        </div>
        <div className="space-y-0.5">
          <p
            className={`text-2xl font-bold tabular-nums ${billing.overdueCount > 0 ? "text-red-700 dark:text-red-400" : "text-foreground"}`}
          >
            {billing.overdueCount}
          </p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {billing.overdueCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span>
            {billing.overdueCount} invoice
            {billing.overdueCount !== 1 ? "s" : ""} overdue.{" "}
            <Link href="/admin/billing" className="underline hover:no-underline">
              Review now
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

function AdmissionsDetailCard({
  admissions,
}: {
  admissions: AdmissionsStats;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Admissions Pipeline
        </h3>
        <Link
          href="/admin/admissions"
          className="text-xs font-medium text-primary hover:underline"
        >
          View pipeline →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-0.5">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {admissions.activeInquiries}
          </p>
          <p className="text-xs text-muted-foreground">Active inquiries</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {admissions.upcomingTours}
          </p>
          <p className="text-xs text-muted-foreground">Upcoming tours</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">
            {admissions.enrolledThisYear}
          </p>
          <p className="text-xs text-muted-foreground">Enrolled this year</p>
        </div>
      </div>
    </div>
  );
}

function TimesheetAlertCard({
  timesheets,
}: {
  timesheets: TimesheetStats;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Timesheet Approvals
        </h3>
        <Link
          href="/admin/timesheets"
          className="text-xs font-medium text-primary hover:underline"
        >
          Review →
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {timesheets.pendingApproval}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {timesheets.pendingApproval} timesheet
            {timesheets.pendingApproval !== 1 ? "s" : ""} awaiting approval
          </p>
          <p className="text-xs text-muted-foreground">
            Staff have submitted hours for your review
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Shared Sub-components
// ============================================================

function KpiCard({
  label,
  value,
  sublabel,
  href,
  colorVar,
  trend,
  alert,
}: {
  label: string;
  value: string;
  sublabel: string;
  href: string;
  colorVar: string;
  trend?: TrendInfo | null;
  alert?: string;
}) {
  return (
    <Link
      href={href}
      style={
        {
          "--kpi-accent": `var(${colorVar})`,
        } as React.CSSProperties
      }
      className="group flex flex-col rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-muted/50 hover:shadow-sm"
    >
      <div className="mb-1 flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--kpi-accent)" }}
        />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      {trend && (
        <p
          className={`mt-1 text-xs font-medium ${trend.isUp ? "text-[var(--stat-trend-up)]" : trend.isDown ? "text-[var(--stat-trend-down)]" : "text-[var(--stat-trend-neutral)]"}`}
        >
          {trend.label} vs last week
        </p>
      )}
      {alert && (
        <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          {alert}
        </p>
      )}
    </Link>
  );
}

function MiniStat({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-muted/30 p-2 text-center">
      <p className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

/** Time-aware greeting based on server clock. */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Quick action configuration per permission. */
interface QuickAction {
  title: string;
  description: string;
  href: string;
  colorVar: string;
}

function buildQuickActions(
  context: Awaited<ReturnType<typeof getTenantContext>>,
): QuickAction[] {
  const actions: QuickAction[] = [];

  if (hasPermission(context, Permissions.CREATE_OBSERVATION)) {
    actions.push({
      title: "New Observation",
      description: "Capture a learning moment",
      href: "/pedagogy/observations/new",
      colorVar: "--curriculum-area",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_ATTENDANCE)) {
    actions.push({
      title: "Today's Roll",
      description: "Mark attendance for today",
      href: "/attendance",
      colorVar: "--attendance-present",
    });
  }

  if (hasPermission(context, Permissions.VIEW_STUDENTS)) {
    actions.push({
      title: "Students",
      description: "View and manage student profiles",
      href: "/students",
      colorVar: "--curriculum-outcome",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_CURRICULUM)) {
    actions.push({
      title: "Curriculum",
      description: "Browse learning outcomes",
      href: "/pedagogy/curriculum",
      colorVar: "--curriculum-activity",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_MASTERY)) {
    actions.push({
      title: "Mastery Tracking",
      description: "Update student progress",
      href: "/pedagogy/mastery",
      colorVar: "--mastery-mastered",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_REPORTS)) {
    actions.push({
      title: "Reports",
      description: "Create and manage term reports",
      href: "/reports",
      colorVar: "--report-review",
    });
  }

  return actions;
}

interface TrendInfo {
  label: string;
  isUp: boolean;
  isDown: boolean;
}

function computeTrend(
  current: number,
  previous: number,
): TrendInfo | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { label: `+${current}`, isUp: true, isDown: false };

  const diff = current - previous;
  const pct = Math.round((Math.abs(diff) / previous) * 100);

  if (diff > 0) return { label: `+${pct}%`, isUp: true, isDown: false };
  if (diff < 0) return { label: `-${pct}%`, isUp: false, isDown: true };
  return { label: "0%", isUp: false, isDown: false };
}

function QuickActionCard({
  title,
  description,
  href,
  colorVar,
}: QuickAction) {
  return (
    <a
      href={href}
      style={
        {
          "--card-accent": `var(${colorVar})`,
        } as React.CSSProperties
      }
      className="card-interactive group block rounded-xl border border-border bg-card p-[var(--density-card-padding)] transition-shadow hover:shadow-md"
    >
      <div
        className="mb-3 h-1.5 w-8 rounded-full transition-all group-hover:w-12"
        style={{ backgroundColor: "var(--card-accent)" }}
      />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </a>
  );
}