// src/lib/actions/dashboard.ts
"use server";

// ============================================================
// WattleOS V2 - Dashboard Statistics Server Actions
// ============================================================
// WHY a dedicated stats action: The dashboard was a placeholder
// with zero real data. This fetches live counts from attendance,
// observations, mastery, students, billing, timesheets, and
// admissions — all in parallel, scoped by the user's permissions.
//
// Each stat section is fetched conditionally based on permission.
// Queries that the user can't see are never executed, keeping
// the server action lean for lower-permission roles.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { TenantContext } from "@/types/domain";

// ============================================================
// Interfaces
// ============================================================

export interface AttendanceStats {
  /** Total students expected today (enrolled + active in a class) */
  totalExpected: number;
  /** Students marked present (includes late + half_day) */
  present: number;
  /** Students marked absent */
  absent: number;
  /** Students marked late */
  late: number;
  /** Students marked excused */
  excused: number;
  /** Students marked half_day */
  halfDay: number;
  /** Students with no record yet today */
  unmarked: number;
  /** Attendance rate: (present+late+halfDay) / totalExpected * 100 */
  attendanceRate: number;
  /** Whether all students have been marked */
  rollComplete: boolean;
}

export interface ObservationStats {
  /** Observations created this week (Mon-Sun) by anyone */
  thisWeekTotal: number;
  /** Observations created last week for comparison */
  lastWeekTotal: number;
  /** Observations created this week by the current user */
  thisWeekMine: number;
  /** Published observations this week */
  thisWeekPublished: number;
  /** Draft observations this week */
  thisWeekDrafts: number;
}

export interface MasteryStats {
  /** Students who achieved "mastered" status this week */
  newMasteriesThisWeek: number;
  /** Total mastery records across all students */
  totalMasteryRecords: number;
  /** Breakdown by status */
  byStatus: {
    not_started: number;
    presented: number;
    practicing: number;
    mastered: number;
  };
  /** Overall mastery rate: mastered / total * 100 */
  masteryRate: number;
}

export interface StudentStats {
  /** Total active (non-deleted, enrolled) students */
  totalActive: number;
  /** Students enrolled this month */
  enrolledThisMonth: number;
  /** Students by enrollment status */
  byEnrollmentStatus: Record<string, number>;
}

export interface BillingStats {
  /** Total outstanding balance in cents */
  outstandingCents: number;
  /** Number of overdue invoices */
  overdueCount: number;
  /** Total collected this month in cents */
  collectedThisMonthCents: number;
  /** Currency code */
  currency: string;
}

export interface TimesheetStats {
  /** Timesheets awaiting approval */
  pendingApproval: number;
}

export interface AdmissionsStats {
  /** Active inquiries (non-terminal stages) */
  activeInquiries: number;
  /** Families enrolled this year */
  enrolledThisYear: number;
  /** Tours scheduled in the next 30 days */
  upcomingTours: number;
}

export interface DashboardStats {
  attendance: AttendanceStats | null;
  observations: ObservationStats | null;
  mastery: MasteryStats | null;
  students: StudentStats | null;
  billing: BillingStats | null;
  timesheets: TimesheetStats | null;
  admissions: AdmissionsStats | null;
}

// ============================================================
// Date helpers
// ============================================================

function todayDateString(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

function getWeekBounds(timezone: string): {
  thisWeekStart: string;
  thisWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
} {
  const now = new Date();
  // Get current date in the tenant's timezone
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

  // Monday of this week
  const dayOfWeek = tzDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const thisMonday = new Date(tzDate);
  thisMonday.setDate(tzDate.getDate() + mondayOffset);
  thisMonday.setHours(0, 0, 0, 0);

  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  return {
    thisWeekStart: thisMonday.toISOString(),
    thisWeekEnd: thisSunday.toISOString(),
    lastWeekStart: lastMonday.toISOString(),
    lastWeekEnd: lastSunday.toISOString(),
  };
}

function getMonthStart(timezone: string): string {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const first = new Date(tzDate.getFullYear(), tzDate.getMonth(), 1);
  return first.toISOString();
}

function getYearStart(timezone: string): string {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const first = new Date(tzDate.getFullYear(), 0, 1);
  return first.toISOString();
}

// ============================================================
// FETCH: Attendance stats for today
// ============================================================

async function fetchAttendanceStats(
  context: TenantContext,
  timezone: string,
): Promise<AttendanceStats> {
  const supabase = await createSupabaseServerClient();
  const today = todayDateString(timezone);

  // Parallel: active student count + today's attendance records
  const [studentsResult, attendanceResult] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_status", "enrolled")
      .is("deleted_at", null),
    supabase
      .from("attendance_records")
      .select("status")
      .eq("date", today)
      .is("deleted_at", null),
  ]);

  const totalExpected = studentsResult.count ?? 0;
  const records = (attendanceResult.data ?? []) as Array<{ status: string }>;

  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const excused = records.filter((r) => r.status === "excused").length;
  const halfDay = records.filter((r) => r.status === "half_day").length;
  const marked = records.length;
  const unmarked = Math.max(0, totalExpected - marked);

  const attending = present + late + halfDay;
  const attendanceRate =
    totalExpected > 0 ? Math.round((attending / totalExpected) * 100) : 0;

  return {
    totalExpected,
    present,
    absent,
    late,
    excused,
    halfDay,
    unmarked,
    attendanceRate,
    rollComplete: unmarked === 0 && totalExpected > 0,
  };
}

// ============================================================
// FETCH: Observation stats for this week
// ============================================================

async function fetchObservationStats(
  context: TenantContext,
  timezone: string,
): Promise<ObservationStats> {
  const supabase = await createSupabaseServerClient();
  const weeks = getWeekBounds(timezone);

  // Parallel: this week total, this week mine, last week total
  const [thisWeekResult, lastWeekResult, thisWeekMineResult] =
    await Promise.all([
      supabase
        .from("observations")
        .select("status")
        .gte("created_at", weeks.thisWeekStart)
        .lte("created_at", weeks.thisWeekEnd)
        .is("deleted_at", null),
      supabase
        .from("observations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weeks.lastWeekStart)
        .lte("created_at", weeks.lastWeekEnd)
        .is("deleted_at", null),
      supabase
        .from("observations")
        .select("id", { count: "exact", head: true })
        .eq("author_id", context.user.id)
        .gte("created_at", weeks.thisWeekStart)
        .lte("created_at", weeks.thisWeekEnd)
        .is("deleted_at", null),
    ]);

  const thisWeekObs = (thisWeekResult.data ?? []) as Array<{
    status: string;
  }>;

  return {
    thisWeekTotal: thisWeekObs.length,
    lastWeekTotal: lastWeekResult.count ?? 0,
    thisWeekMine: thisWeekMineResult.count ?? 0,
    thisWeekPublished: thisWeekObs.filter((o) => o.status === "published")
      .length,
    thisWeekDrafts: thisWeekObs.filter((o) => o.status === "draft").length,
  };
}

// ============================================================
// FETCH: Mastery stats
// ============================================================

async function fetchMasteryStats(
  context: TenantContext,
  timezone: string,
): Promise<MasteryStats> {
  const supabase = await createSupabaseServerClient();
  const weeks = getWeekBounds(timezone);

  // Parallel: status breakdown + new masteries this week
  const [statusResult, newMasteriesResult] = await Promise.all([
    supabase.from("student_mastery").select("status").is("deleted_at", null),
    supabase
      .from("mastery_history")
      .select("id", { count: "exact", head: true })
      .eq("new_status", "mastered")
      .gte("changed_at", weeks.thisWeekStart)
      .lte("changed_at", weeks.thisWeekEnd),
  ]);

  const statuses = (statusResult.data ?? []) as Array<{ status: string }>;

  const byStatus = {
    not_started: statuses.filter((s) => s.status === "not_started").length,
    presented: statuses.filter((s) => s.status === "presented").length,
    practicing: statuses.filter((s) => s.status === "practicing").length,
    mastered: statuses.filter((s) => s.status === "mastered").length,
  };

  const total = statuses.length;

  return {
    newMasteriesThisWeek: newMasteriesResult.count ?? 0,
    totalMasteryRecords: total,
    byStatus,
    masteryRate: total > 0 ? Math.round((byStatus.mastered / total) * 100) : 0,
  };
}

// ============================================================
// FETCH: Student stats
// ============================================================

async function fetchStudentStats(
  context: TenantContext,
  timezone: string,
): Promise<StudentStats> {
  const supabase = await createSupabaseServerClient();
  const monthStart = getMonthStart(timezone);

  // Parallel: total active + enrolled this month + by status
  const [activeResult, thisMonthResult, allResult] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_status", "enrolled")
      .is("deleted_at", null),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_status", "enrolled")
      .gte("enrollment_date", monthStart)
      .is("deleted_at", null),
    supabase
      .from("students")
      .select("enrollment_status")
      .is("deleted_at", null),
  ]);

  const allStudents = (allResult.data ?? []) as Array<{
    enrollment_status: string;
  }>;
  const byEnrollmentStatus: Record<string, number> = {};
  for (const s of allStudents) {
    byEnrollmentStatus[s.enrollment_status] =
      (byEnrollmentStatus[s.enrollment_status] ?? 0) + 1;
  }

  return {
    totalActive: activeResult.count ?? 0,
    enrolledThisMonth: thisMonthResult.count ?? 0,
    byEnrollmentStatus,
  };
}

// ============================================================
// FETCH: Billing stats
// ============================================================

async function fetchBillingStats(
  context: TenantContext,
  timezone: string,
): Promise<BillingStats> {
  const supabase = await createSupabaseServerClient();
  const monthStart = getMonthStart(timezone);

  // Parallel: outstanding + overdue + collected this month
  const [outstandingResult, overdueResult, paidResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_cents, amount_paid_cents")
      .in("status", ["sent", "pending", "overdue"])
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "overdue")
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("amount_paid_cents")
      .eq("status", "paid")
      .gte("paid_at", monthStart)
      .is("deleted_at", null),
  ]);

  const outstandingRows = (outstandingResult.data ?? []) as Array<{
    total_cents: number;
    amount_paid_cents: number;
  }>;
  const outstandingCents = outstandingRows.reduce(
    (sum, inv) => sum + (inv.total_cents - inv.amount_paid_cents),
    0,
  );

  const paidRows = (paidResult.data ?? []) as Array<{
    amount_paid_cents: number;
  }>;
  const collectedThisMonthCents = paidRows.reduce(
    (sum, inv) => sum + inv.amount_paid_cents,
    0,
  );

  return {
    outstandingCents,
    overdueCount: overdueResult.count ?? 0,
    collectedThisMonthCents,
    currency: context.tenant.currency ?? "AUD",
  };
}

// ============================================================
// FETCH: Timesheet stats
// ============================================================

async function fetchTimesheetStats(
  context: TenantContext,
): Promise<TimesheetStats> {
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("timesheets")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted")
    .is("deleted_at", null);

  return {
    pendingApproval: count ?? 0,
  };
}

// ============================================================
// FETCH: Admissions stats
// ============================================================

async function fetchAdmissionsStats(
  context: TenantContext,
  timezone: string,
): Promise<AdmissionsStats> {
  const supabase = await createSupabaseServerClient();
  const yearStart = getYearStart(timezone);

  const activeStages = [
    "inquiry",
    "tour_scheduled",
    "tour_completed",
    "application_submitted",
    "offer_sent",
    "offer_accepted",
  ];

  const [activeResult, enrolledResult, toursResult] = await Promise.all([
    supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .in("stage", activeStages)
      .is("deleted_at", null),
    supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("stage", "enrolled")
      .gte("created_at", yearStart)
      .is("deleted_at", null),
    supabase
      .from("tour_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("tour_date", todayDateString(timezone))
      .is("deleted_at", null),
  ]);

  return {
    activeInquiries: activeResult.count ?? 0,
    enrolledThisYear: enrolledResult.count ?? 0,
    upcomingTours: toursResult.count ?? 0,
  };
}

// ============================================================
// MAIN: getDashboardStats
// ============================================================
// WHY permission-gated parallel fetches: A guide doesn't need
// billing or timesheet approval data. By checking permissions
// first, we avoid unnecessary queries AND avoid leaking data
// to roles that shouldn't see it. All fetches run in parallel
// for minimum latency.
// ============================================================

export async function getDashboardStats(): Promise<
  ActionResponse<DashboardStats>
> {
  try {
    const context = await getTenantContext();
    const timezone = context.tenant.timezone ?? "Australia/Brisbane";

    // Build parallel fetch array based on permissions
    const fetches: Array<Promise<void>> = [];
    const stats: DashboardStats = {
      attendance: null,
      observations: null,
      mastery: null,
      students: null,
      billing: null,
      timesheets: null,
      admissions: null,
    };

    // Attendance: any staff who can manage or view attendance
    if (
      hasPermission(context, Permissions.MANAGE_ATTENDANCE) ||
      hasPermission(context, Permissions.VIEW_ATTENDANCE_REPORTS)
    ) {
      fetches.push(
        fetchAttendanceStats(context, timezone).then((data) => {
          stats.attendance = data;
        }),
      );
    }

    // Observations: anyone who can create or view observations
    if (
      hasPermission(context, Permissions.CREATE_OBSERVATION) ||
      hasPermission(context, Permissions.VIEW_ALL_OBSERVATIONS)
    ) {
      fetches.push(
        fetchObservationStats(context, timezone).then((data) => {
          stats.observations = data;
        }),
      );
    }

    // Mastery: anyone who can manage mastery tracking
    if (hasPermission(context, Permissions.MANAGE_MASTERY)) {
      fetches.push(
        fetchMasteryStats(context, timezone).then((data) => {
          stats.mastery = data;
        }),
      );
    }

    // Students: anyone who can view students
    if (hasPermission(context, Permissions.VIEW_STUDENTS)) {
      fetches.push(
        fetchStudentStats(context, timezone).then((data) => {
          stats.students = data;
        }),
      );
    }

    // Billing: admin-level (manage integrations or tenant settings)
    if (
      hasPermission(context, Permissions.MANAGE_INTEGRATIONS) ||
      hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS)
    ) {
      fetches.push(
        fetchBillingStats(context, timezone).then((data) => {
          stats.billing = data;
        }),
      );
    }

    // Timesheets: anyone who can approve timesheets
    if (hasPermission(context, Permissions.APPROVE_TIMESHEETS)) {
      fetches.push(
        fetchTimesheetStats(context).then((data) => {
          stats.timesheets = data;
        }),
      );
    }

    // Admissions: anyone with waitlist/admissions permissions
    if (
      hasPermission(context, Permissions.VIEW_WAITLIST) ||
      hasPermission(context, Permissions.MANAGE_WAITLIST) ||
      hasPermission(context, Permissions.VIEW_ADMISSIONS_ANALYTICS)
    ) {
      fetches.push(
        fetchAdmissionsStats(context, timezone).then((data) => {
          stats.admissions = data;
        }),
      );
    }

    // Execute all permitted fetches in parallel
    await Promise.all(fetches);

    return success(stats);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboard stats";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
