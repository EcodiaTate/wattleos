"use server";

// src/lib/actions/ccs.ts
//
// ============================================================
// WattleOS V2 - Module G: CCS Session Reporting
// ============================================================
// Generates weekly session reports from program bookings,
// manages bundles, absence coding, 42-day cap tracking,
// and CSV export for CCMS submission.
//
// Permissions:
//   VIEW_CCS_REPORTS   - read bundles, reports, absence caps
//   MANAGE_CCS_REPORTS - generate, update, submit, export
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type ActionResponse,
  type PaginatedResponse,
  ErrorCodes,
  failure,
  success,
  paginated,
  paginatedFailure,
} from "@/types/api";
import type {
  CcsWeeklyBundle,
  CcsSessionReport,
  CcsSessionReportWithStudent,
  CcsWeeklyBundleWithCounts,
  CcsAbsenceCapSummary,
  CcsDashboardData,
  CcsAbsenceTypeCode,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  updateSessionReportSchema,
  listBundlesFilterSchema,
  absenceCapQuerySchema,
} from "@/lib/validations/ccs";
import {
  CCS_ANNUAL_ABSENCE_CAP,
  CCS_WARNING_THRESHOLD,
  getCurrentFinancialYear,
  getFinancialYearDates,
  mapProgramTypeToCcsSessionType,
  getWeekStartDate,
  getWeekEndDate,
} from "@/lib/constants/ccs";
import type { ProgramType } from "@/types/domain";

// ============================================================
// READ: Absence Type Codes (reference data)
// ============================================================

export async function getAbsenceTypeCodes(): Promise<
  ActionResponse<CcsAbsenceTypeCode[]>
> {
  try {
    await requirePermission(Permissions.VIEW_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ccs_absence_type_codes")
      .select("code, label, description, annual_cap_applies, requires_evidence")
      .order("code");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as CcsAbsenceTypeCode[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Dashboard
// ============================================================

export async function getCcsDashboard(): Promise<
  ActionResponse<CcsDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const now = new Date();
    const weekStart = getWeekStartDate(now);
    const weekEnd = getWeekEndDate(now);

    // Current week bundle
    const { data: currentBundle } = await supabase
      .from("ccs_weekly_bundles")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("week_start_date", weekStart)
      .maybeSingle();

    let currentWeekBundle: CcsWeeklyBundleWithCounts | null = null;
    if (currentBundle) {
      const counts = await getBundleCounts(
        supabase,
        context.tenant.id,
        currentBundle.id,
      );
      currentWeekBundle = { ...(currentBundle as CcsWeeklyBundle), ...counts };
    }

    // Recent bundles (last 8 weeks)
    const { data: recentRaw } = await supabase
      .from("ccs_weekly_bundles")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("week_start_date", { ascending: false })
      .limit(8);

    const recentBundles: CcsWeeklyBundleWithCounts[] = [];
    for (const bundle of (recentRaw ?? []) as CcsWeeklyBundle[]) {
      if (bundle.id === currentBundle?.id) continue;
      const counts = await getBundleCounts(
        supabase,
        context.tenant.id,
        bundle.id,
      );
      recentBundles.push({ ...bundle, ...counts });
    }

    // Unbundled reports count
    const { count: unbundledCount } = await supabase
      .from("ccs_session_reports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .is("bundle_id", null)
      .is("deleted_at", null);

    // Children near absence cap
    const childrenNearCap = await getChildrenNearCap(
      supabase,
      context.tenant.id,
    );

    return success({
      current_week_bundle: currentWeekBundle,
      recent_bundles: recentBundles,
      children_near_cap: childrenNearCap,
      unbundled_report_count: unbundledCount ?? 0,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Single Bundle
// ============================================================

export async function getWeeklyBundle(
  bundleId: string,
): Promise<ActionResponse<CcsWeeklyBundleWithCounts>> {
  try {
    const context = await requirePermission(Permissions.VIEW_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ccs_weekly_bundles")
      .select("*")
      .eq("id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error || !data)
      return failure("Bundle not found", ErrorCodes.NOT_FOUND);

    const counts = await getBundleCounts(supabase, context.tenant.id, data.id);

    return success({
      ...(data as CcsWeeklyBundle),
      ...counts,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Paginated Bundle List
// ============================================================

export async function listWeeklyBundles(
  filter: unknown,
): Promise<PaginatedResponse<CcsWeeklyBundleWithCounts>> {
  try {
    const context = await requirePermission(Permissions.VIEW_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const parsed = listBundlesFilterSchema.safeParse(filter);
    if (!parsed.success)
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Validation error",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { status, page, perPage } = parsed.data;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("ccs_weekly_bundles")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .order("week_start_date", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    const bundles: CcsWeeklyBundleWithCounts[] = [];
    for (const row of (data ?? []) as CcsWeeklyBundle[]) {
      const counts = await getBundleCounts(supabase, context.tenant.id, row.id);
      bundles.push({ ...row, ...counts });
    }

    return paginated(bundles, count ?? 0, page, perPage);
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Reports in a Bundle
// ============================================================

export async function listBundleReports(
  bundleId: string,
): Promise<ActionResponse<CcsSessionReportWithStudent[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ccs_session_reports")
      .select("*, students!inner(id, first_name, last_name, crn)")
      .eq("tenant_id", context.tenant.id)
      .eq("bundle_id", bundleId)
      .is("deleted_at", null)
      .order("session_date")
      .order("start_time");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const reports = (data ?? []).map((row: Record<string, unknown>) => {
      const { students, ...report } = row;
      return {
        ...report,
        student: students,
      };
    }) as CcsSessionReportWithStudent[];

    return success(reports);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Absence Cap Summary
// ============================================================

export async function getAbsenceCapSummary(
  filter?: unknown,
): Promise<ActionResponse<CcsAbsenceCapSummary[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const parsed = absenceCapQuerySchema.safeParse(filter ?? {});
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Validation error",
        ErrorCodes.VALIDATION_ERROR,
      );

    const fy = parsed.data.financial_year ?? getCurrentFinancialYear();
    const { start, end } = getFinancialYearDates(fy);

    let reportQuery = supabase
      .from("ccs_session_reports")
      .select(
        "student_id, absence_flag, absence_type_code, ccs_absence_type_codes!left(annual_cap_applies)",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("absence_flag", true)
      .gte("session_date", start)
      .lte("session_date", end)
      .is("deleted_at", null);

    if (parsed.data.student_id)
      reportQuery = reportQuery.eq("student_id", parsed.data.student_id);

    const { data: absenceData, error: absenceError } = await reportQuery;
    if (absenceError)
      return failure(absenceError.message, ErrorCodes.DATABASE_ERROR);

    // Group by student
    const studentMap = new Map<string, { capped: number; uncapped: number }>();
    for (const row of absenceData ?? []) {
      const r = row as Record<string, unknown>;
      const sid = r.student_id as string;
      if (!studentMap.has(sid)) studentMap.set(sid, { capped: 0, uncapped: 0 });
      const entry = studentMap.get(sid)!;

      const codeInfo = r.ccs_absence_type_codes as {
        annual_cap_applies: boolean;
      } | null;
      if (codeInfo?.annual_cap_applies) {
        entry.capped++;
      } else {
        entry.uncapped++;
      }
    }

    // Fetch student details
    const studentIds = Array.from(studentMap.keys());
    if (studentIds.length === 0) return success([]);

    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, crn")
      .in("id", studentIds)
      .eq("tenant_id", context.tenant.id);

    const summaries: CcsAbsenceCapSummary[] = (students ?? []).map(
      (s: Record<string, unknown>) => {
        const counts = studentMap.get(s.id as string) ?? {
          capped: 0,
          uncapped: 0,
        };
        return {
          student: {
            id: s.id as string,
            first_name: s.first_name as string,
            last_name: s.last_name as string,
            crn: s.crn as string | null,
          },
          financial_year: fy,
          capped_days_used: counts.capped,
          uncapped_days: counts.uncapped,
          cap_limit: 42 as const,
          is_warning: counts.capped >= CCS_WARNING_THRESHOLD,
          is_at_cap: counts.capped >= CCS_ANNUAL_ABSENCE_CAP,
        };
      },
    );

    // Sort by capped days descending
    summaries.sort((a, b) => b.capped_days_used - a.capped_days_used);

    return success(summaries);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Generate Weekly Reports from Bookings
// ============================================================

export async function generateWeeklyReports(
  weekStartDate: string,
): Promise<ActionResponse<CcsWeeklyBundle>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Compute week boundaries
    const startDate = new Date(weekStartDate);
    const weekStart = getWeekStartDate(startDate);
    const weekEnd = getWeekEndDate(startDate);

    // Check for existing bundle
    const { data: existing } = await supabase
      .from("ccs_weekly_bundles")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("week_start_date", weekStart)
      .maybeSingle();

    if (existing)
      return failure(
        "A bundle already exists for this week",
        ErrorCodes.ALREADY_EXISTS,
      );

    // Find CCS-eligible programs
    const { data: programs } = await supabase
      .from("programs")
      .select("id, program_type")
      .eq("tenant_id", context.tenant.id)
      .eq("ccs_eligible", true)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!programs || programs.length === 0)
      return failure("No CCS-eligible programs found", ErrorCodes.NOT_FOUND);

    const programIds = programs.map((p: { id: string }) => p.id);
    const programTypeMap = new Map(
      programs.map((p: { id: string; program_type: string }) => [
        p.id,
        p.program_type as ProgramType,
      ]),
    );

    // Find sessions in the week
    const { data: sessions } = await supabase
      .from("program_sessions")
      .select("id, program_id, date, start_time, end_time")
      .in("program_id", programIds)
      .eq("tenant_id", context.tenant.id)
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .is("deleted_at", null);

    if (!sessions || sessions.length === 0)
      return failure("No sessions found for this week", ErrorCodes.NOT_FOUND);

    const sessionIds = sessions.map((s: { id: string }) => s.id);
    const sessionMap = new Map(
      sessions.map(
        (s: {
          id: string;
          program_id: string;
          date: string;
          start_time: string;
          end_time: string;
        }) => [s.id, s],
      ),
    );

    // Find bookings for those sessions (confirmed + no_show)
    const { data: bookings } = await supabase
      .from("session_bookings")
      .select(
        "id, session_id, student_id, status, checked_in_at, checked_out_at, fee_cents",
      )
      .in("session_id", sessionIds)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["confirmed", "no_show"])
      .is("deleted_at", null);

    if (!bookings || bookings.length === 0)
      return failure(
        "No bookings found for this week's sessions",
        ErrorCodes.NOT_FOUND,
      );

    // Create the bundle
    const { data: bundle, error: bundleError } = await supabase
      .from("ccs_weekly_bundles")
      .insert({
        tenant_id: context.tenant.id,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        status: "draft",
      })
      .select("*")
      .single();

    if (bundleError || !bundle)
      return failure(
        bundleError?.message ?? "Failed to create bundle",
        ErrorCodes.CREATE_FAILED,
      );

    // Generate session reports from bookings
    const reports = bookings.map(
      (booking: {
        id: string;
        session_id: string;
        student_id: string;
        status: string;
        checked_in_at: string | null;
        checked_out_at: string | null;
        fee_cents: number;
      }) => {
        const session = sessionMap.get(booking.session_id)!;
        const programType = programTypeMap.get(session.program_id)!;
        const sessionType = mapProgramTypeToCcsSessionType(programType);

        // Absence if no check-in
        const absenceFlag = !booking.checked_in_at;

        // Hours: use check-in/out if available, otherwise session times
        let hoursOfCare = 0;
        if (booking.checked_in_at && booking.checked_out_at) {
          const inTime = new Date(`${session.date}T${booking.checked_in_at}`);
          const outTime = new Date(`${session.date}T${booking.checked_out_at}`);
          hoursOfCare = Math.max(
            0,
            (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60),
          );
        } else if (!absenceFlag) {
          // Fallback to session times
          const inTime = new Date(`${session.date}T${session.start_time}`);
          const outTime = new Date(`${session.date}T${session.end_time}`);
          hoursOfCare = Math.max(
            0,
            (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60),
          );
        }

        return {
          tenant_id: context.tenant.id,
          bundle_id: bundle.id,
          student_id: booking.student_id,
          session_date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
          hours_of_care: Math.round(hoursOfCare * 100) / 100,
          session_type: sessionType,
          full_fee_cents: booking.fee_cents,
          gap_fee_cents: 0,
          absence_flag: absenceFlag,
          absence_type_code: null,
          prescribed_discount_cents: 0,
          third_party_payment_cents: 0,
          report_status: "draft",
          notes: null,
        };
      },
    );

    const { error: reportsError } = await supabase
      .from("ccs_session_reports")
      .insert(reports);

    if (reportsError)
      return failure(reportsError.message, ErrorCodes.CREATE_FAILED);

    logAudit({
      context,
      action: AuditActions.CCS_REPORTS_GENERATED,
      entityType: "ccs_weekly_bundle",
      entityId: bundle.id,
      metadata: {
        week_start: weekStart,
        week_end: weekEnd,
        report_count: reports.length,
      },
    });

    return success(bundle as CcsWeeklyBundle);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Update Session Report
// ============================================================

export async function updateSessionReport(
  reportId: string,
  input: unknown,
): Promise<ActionResponse<CcsSessionReport>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateSessionReportSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Validation error",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data: existing } = await supabase
      .from("ccs_session_reports")
      .select("id, report_status, bundle_id")
      .eq("id", reportId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return failure("Report not found", ErrorCodes.NOT_FOUND);

    if (
      existing.report_status === "submitted" ||
      existing.report_status === "accepted"
    )
      return failure(
        "Cannot edit a submitted or accepted report",
        ErrorCodes.INVALID_STATUS_TRANSITION,
      );

    const updateData: Record<string, unknown> = {};
    if (parsed.data.absence_type_code !== undefined)
      updateData.absence_type_code = parsed.data.absence_type_code;
    if (parsed.data.prescribed_discount_cents !== undefined)
      updateData.prescribed_discount_cents =
        parsed.data.prescribed_discount_cents;
    if (parsed.data.third_party_payment_cents !== undefined)
      updateData.third_party_payment_cents =
        parsed.data.third_party_payment_cents;
    if (parsed.data.gap_fee_cents !== undefined)
      updateData.gap_fee_cents = parsed.data.gap_fee_cents;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const { data, error } = await supabase
      .from("ccs_session_reports")
      .update(updateData)
      .eq("id", reportId)
      .eq("tenant_id", context.tenant.id)
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    logAudit({
      context,
      action: AuditActions.CCS_REPORT_UPDATED,
      entityType: "ccs_session_report",
      entityId: reportId,
      metadata: updateData,
    });

    return success(data as CcsSessionReport);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Submit Bundle
// ============================================================

export async function submitBundle(
  bundleId: string,
): Promise<ActionResponse<CcsWeeklyBundle>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Check bundle exists and is draft
    const { data: bundle } = await supabase
      .from("ccs_weekly_bundles")
      .select("*")
      .eq("id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!bundle) return failure("Bundle not found", ErrorCodes.NOT_FOUND);

    if (bundle.status !== "draft" && bundle.status !== "ready")
      return failure(
        "Bundle can only be submitted from draft or ready status",
        ErrorCodes.INVALID_STATUS_TRANSITION,
      );

    // Validate all absence reports have codes
    const { data: uncoded } = await supabase
      .from("ccs_session_reports")
      .select("id")
      .eq("bundle_id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .eq("absence_flag", true)
      .is("absence_type_code", null)
      .is("deleted_at", null);

    if (uncoded && uncoded.length > 0)
      return failure(
        `${uncoded.length} absence report(s) are missing absence type codes`,
        ErrorCodes.VALIDATION_ERROR,
      );

    // Update bundle status
    const { data: updated, error } = await supabase
      .from("ccs_weekly_bundles")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_by: context.user.id,
      })
      .eq("id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    // Mark all reports as submitted
    await supabase
      .from("ccs_session_reports")
      .update({ report_status: "submitted" })
      .eq("bundle_id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    logAudit({
      context,
      action: AuditActions.CCS_BUNDLE_SUBMITTED,
      entityType: "ccs_weekly_bundle",
      entityId: bundleId,
      metadata: {
        week_start: bundle.week_start_date,
        week_end: bundle.week_end_date,
      },
    });

    return success(updated as CcsWeeklyBundle);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Export Bundle as CSV
// ============================================================

export async function exportBundle(
  bundleId: string,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CCS_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data: bundle } = await supabase
      .from("ccs_weekly_bundles")
      .select("*")
      .eq("id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!bundle) return failure("Bundle not found", ErrorCodes.NOT_FOUND);

    const { data: reports } = await supabase
      .from("ccs_session_reports")
      .select("*, students!inner(id, first_name, last_name, crn)")
      .eq("bundle_id", bundleId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("session_date")
      .order("start_time");

    if (!reports || reports.length === 0)
      return failure("No reports in bundle", ErrorCodes.NOT_FOUND);

    // Build CSV
    const csvHeaders = [
      "Child CRN",
      "Child First Name",
      "Child Last Name",
      "Session Date",
      "Session Start",
      "Session End",
      "Hours of Care",
      "Session Type",
      "Full Fee ($)",
      "Gap Fee ($)",
      "Absence",
      "Absence Code",
      "Prescribed Discount ($)",
      "Third Party Payment ($)",
      "Notes",
    ].join(",");

    const csvRows = reports.map((row: Record<string, unknown>) => {
      const student = row.students as {
        crn: string | null;
        first_name: string;
        last_name: string;
      };
      return [
        escapeCsv(student.crn ?? ""),
        escapeCsv(student.first_name),
        escapeCsv(student.last_name),
        row.session_date,
        row.start_time,
        row.end_time,
        row.hours_of_care,
        row.session_type,
        ((row.full_fee_cents as number) / 100).toFixed(2),
        ((row.gap_fee_cents as number) / 100).toFixed(2),
        row.absence_flag ? "Yes" : "No",
        escapeCsv((row.absence_type_code as string) ?? ""),
        ((row.prescribed_discount_cents as number) / 100).toFixed(2),
        ((row.third_party_payment_cents as number) / 100).toFixed(2),
        escapeCsv((row.notes as string) ?? ""),
      ].join(",");
    });

    const csv = [csvHeaders, ...csvRows].join("\n");

    logAudit({
      context,
      action: AuditActions.CCS_BUNDLE_EXPORTED,
      entityType: "ccs_weekly_bundle",
      entityId: bundleId,
      metadata: {
        week_start: bundle.week_start_date,
        report_count: reports.length,
      },
    });

    return success(csv);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Internal Helpers
// ============================================================

async function getBundleCounts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  bundleId: string,
): Promise<{
  report_count: number;
  absence_count: number;
  total_fee_cents: number;
}> {
  const { data: reports } = await supabase
    .from("ccs_session_reports")
    .select("full_fee_cents, absence_flag")
    .eq("bundle_id", bundleId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (!reports || reports.length === 0)
    return { report_count: 0, absence_count: 0, total_fee_cents: 0 };

  let absenceCount = 0;
  let totalFeeCents = 0;
  for (const r of reports as {
    full_fee_cents: number;
    absence_flag: boolean;
  }[]) {
    if (r.absence_flag) absenceCount++;
    totalFeeCents += r.full_fee_cents;
  }

  return {
    report_count: reports.length,
    absence_count: absenceCount,
    total_fee_cents: totalFeeCents,
  };
}

async function getChildrenNearCap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
): Promise<CcsAbsenceCapSummary[]> {
  const fy = getCurrentFinancialYear();
  const { start, end } = getFinancialYearDates(fy);

  const { data: absenceData } = await supabase
    .from("ccs_session_reports")
    .select("student_id, ccs_absence_type_codes!left(annual_cap_applies)")
    .eq("tenant_id", tenantId)
    .eq("absence_flag", true)
    .gte("session_date", start)
    .lte("session_date", end)
    .is("deleted_at", null);

  if (!absenceData || absenceData.length === 0) return [];

  const studentMap = new Map<string, { capped: number; uncapped: number }>();
  for (const row of absenceData) {
    const r = row as Record<string, unknown>;
    const sid = r.student_id as string;
    if (!studentMap.has(sid)) studentMap.set(sid, { capped: 0, uncapped: 0 });
    const entry = studentMap.get(sid)!;

    const codeInfo = r.ccs_absence_type_codes as {
      annual_cap_applies: boolean;
    } | null;
    if (codeInfo?.annual_cap_applies) {
      entry.capped++;
    } else {
      entry.uncapped++;
    }
  }

  // Filter to those near or at cap
  const nearCapIds: string[] = [];
  for (const [id, counts] of studentMap) {
    if (counts.capped >= CCS_WARNING_THRESHOLD) nearCapIds.push(id);
  }

  if (nearCapIds.length === 0) return [];

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, crn")
    .in("id", nearCapIds)
    .eq("tenant_id", tenantId);

  return (students ?? []).map((s: Record<string, unknown>) => {
    const counts = studentMap.get(s.id as string) ?? {
      capped: 0,
      uncapped: 0,
    };
    return {
      student: {
        id: s.id as string,
        first_name: s.first_name as string,
        last_name: s.last_name as string,
        crn: s.crn as string | null,
      },
      financial_year: fy,
      capped_days_used: counts.capped,
      uncapped_days: counts.uncapped,
      cap_limit: 42 as const,
      is_warning: counts.capped >= CCS_WARNING_THRESHOLD,
      is_at_cap: counts.capped >= CCS_ANNUAL_ABSENCE_CAP,
    };
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
