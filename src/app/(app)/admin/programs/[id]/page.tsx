// src/app/(app)/admin/programs/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Program Detail Page
// ============================================================
// Server Component. Shows the full program overview with:
// - Program metadata (type, schedule, pricing, CCS)
// - Upcoming sessions with booking counts
// - Active recurring patterns
// - Quick actions: edit, generate sessions, toggle active
//
// WHY one page not tabs: Program detail is moderate complexity.
// All data fits on one scrollable page without needing tabs.
// The session calendar and reports are separate pages.
// ============================================================

export const metadata = { title: "Program Detail - WattleOS" };

import { GenerateSessionsButton } from "@/components/domain/programs/generate-sessions-button";
import { ProgramTypeBadge } from "@/components/domain/programs/program-type-badge";
import { ToggleProgramActiveButton } from "@/components/domain/programs/toggle-program-active-button";
import { getProgram, listSessions } from "@/lib/actions/programs/programs";
import { getProgramPatterns } from "@/lib/actions/programs/recurring-patterns";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  BILLING_TYPES,
  DAYS_OF_WEEK,
  formatCents,
  formatTime,
  SESSION_STATUS_CONFIG,
  type ProgramTypeValue,
} from "@/lib/constants/programs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_PROGRAMS)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Parallel fetch program + sessions + patterns
  const [programResult, sessionsResult, patternsResult] = await Promise.all([
    getProgram(id),
    listSessions({
      program_id: id,
      from_date: new Date().toISOString().split("T")[0],
      per_page: 10,
    }),
    getProgramPatterns(id),
  ]);

  if (programResult.error || !programResult.data) {
    notFound();
  }

  const program = programResult.data;
  const sessions = sessionsResult.data ?? [];
  const patterns = patternsResult.data ?? [];

  const billingLabel =
    BILLING_TYPES.find((bt) => bt.value === program.billing_type)?.label ??
    program.billing_type;

  const daysDisplay =
    program.default_days.length > 0
      ? program.default_days.map((d) => {
          const found = DAYS_OF_WEEK.find((dw) => dw.value === d);
          return found?.label ?? d;
        })
      : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/programs" className="hover:text-primary">
          Programs
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{program.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">{program.name}</h1>
          <ProgramTypeBadge
            type={program.program_type as ProgramTypeValue}
            showIcon
            size="md"
          />
          {!program.is_active && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-medium text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ToggleProgramActiveButton
            programId={id}
            isActive={program.is_active}
          />
          <Link
            href={`/admin/programs/${id}/edit`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* ============================================ */}
      {/* Overview Grid                                */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Info Card */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Program Details
            </h2>

            {program.description && (
              <p className="text-sm text-muted-foreground">{program.description}</p>
            )}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {program.code && (
                <>
                  <dt className="text-muted-foreground">Code</dt>
                  <dd className="text-foreground font-medium">{program.code}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="text-foreground">
                {daysDisplay.length > 0 ? daysDisplay.join(", ") : "Not set"}
              </dd>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="text-foreground">
                {program.default_start_time && program.default_end_time
                  ? `${formatTime(program.default_start_time)} – ${formatTime(program.default_end_time)}`
                  : "Not set"}
              </dd>
              <dt className="text-muted-foreground">Capacity</dt>
              <dd className="text-foreground">
                {program.max_capacity ?? "Unlimited"}
              </dd>
              {(program.min_age_months != null ||
                program.max_age_months != null) && (
                <>
                  <dt className="text-muted-foreground">Age Range</dt>
                  <dd className="text-foreground">
                    {program.min_age_months != null
                      ? `${Math.floor(program.min_age_months / 12)}y${program.min_age_months % 12 ? ` ${program.min_age_months % 12}m` : ""}`
                      : "Any"}
                    {" – "}
                    {program.max_age_months != null
                      ? `${Math.floor(program.max_age_months / 12)}y${program.max_age_months % 12 ? ` ${program.max_age_months % 12}m` : ""}`
                      : "Any"}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Pricing Card */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Pricing & Policy
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Billing</dt>
              <dd className="text-foreground">{billingLabel}</dd>
              <dt className="text-muted-foreground">Session Fee</dt>
              <dd className="text-foreground font-medium">
                {formatCents(program.session_fee_cents)}
              </dd>
              {program.casual_fee_cents != null && (
                <>
                  <dt className="text-muted-foreground">Casual Fee</dt>
                  <dd className="text-foreground">
                    {formatCents(program.casual_fee_cents)}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Cancellation Notice</dt>
              <dd className="text-foreground">
                {program.cancellation_notice_hours} hours
              </dd>
              <dt className="text-muted-foreground">Late Cancel Fee</dt>
              <dd className="text-foreground">
                {formatCents(program.late_cancel_fee_cents)}
              </dd>
              {program.ccs_eligible && (
                <>
                  <dt className="text-muted-foreground">CCS Eligible</dt>
                  <dd className="text-foreground">
                    Yes
                    {program.ccs_activity_type &&
                      ` (${program.ccs_activity_type})`}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Right: Quick Stats */}
        <div className="space-y-6">
          {/* Generate Sessions Card */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Session Generation
            </h2>
            <p className="text-xs text-muted-foreground">
              Generate upcoming sessions based on the program schedule.
            </p>
            <GenerateSessionsButton programId={id} />
          </div>

          {/* Recurring Patterns Summary */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Recurring Bookings
            </h2>
            {patterns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recurring patterns yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {patterns.map((pattern) => (
                  <li
                    key={pattern.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {pattern.student.first_name} {pattern.student.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pattern.days_of_week
                          .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                          .join(", ")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        pattern.status === "active"
                          ? "bg-success/15 text-success"
                          : pattern.status === "paused"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {pattern.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Upcoming Sessions                            */}
      {/* ============================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Upcoming Sessions
          </h2>
          <Link
            href={`/admin/programs/calendar?program=${id}`}
            className="text-sm font-medium text-primary hover:text-primary"
          >
            View Calendar →
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No upcoming sessions. Generate sessions to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Location
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Booked
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Waitlist
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Checked In
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => {
                  const statusConfig =
                    SESSION_STATUS_CONFIG[session.status] ??
                    SESSION_STATUS_CONFIG.scheduled;
                  const capacity = session.max_capacity ?? program.max_capacity;
                  const isFull =
                    capacity != null && session.confirmed_count >= capacity;

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-muted transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/programs/sessions/${session.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary"
                        >
                          {new Date(
                            session.date + "T00:00:00",
                          ).toLocaleDateString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatTime(session.start_time)} –{" "}
                        {formatTime(session.end_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {session.location ?? " - "}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-medium ${
                            isFull ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {session.confirmed_count}
                          {capacity != null && `/${capacity}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                        {session.waitlisted_count > 0
                          ? session.waitlisted_count
                          : " - "}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-foreground">
                        {session.checked_in_count > 0
                          ? session.checked_in_count
                          : " - "}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.badgeBg} ${statusConfig.badgeText}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
