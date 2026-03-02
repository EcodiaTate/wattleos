"use server";

// src/lib/actions/acara.ts
//
// ============================================================
// ACARA Attendance Reporting - Server Actions
// ============================================================
// Builds, manages, and exports attendance reports in the format
// required by the Australian Curriculum, Assessment and Reporting
// Authority (ACARA) Annual School Collection (ASC).
//
// Data flow:
//   1. Admin creates a report period (year + date range)
//   2. "Sync" pulls live attendance_records and computes per-student
//      summaries → writes to acara_student_records
//   3. Admin reviews, optionally overrides individual records
//   4. Verify → Export (CSV) → Submit
//
// Attendance rules (ACARA convention):
//   present   → 1.0 actual day
//   half_day  → 0.5 actual day
//   late      → counted as present (1.0) by default
//   excused   → 0 actual, 1.0 absent_explained
//   absent    → 0 actual, check for explanation:
//               if no notes → unexplained_days++
//               if notes    → absent_explained++
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { ActionResponse, failure, success } from "@/types/api";
import type {
  AcaraDashboardData,
  AcaraReportPeriod,
  AcaraReportPeriodWithCounts,
  AcaraStudentRecord,
  AcaraStudentRecordWithStudent,
} from "@/types/domain";
import type {
  CreateAcaraReportPeriodInput,
  ExportAcaraStudentProfileInput,
  ListAcaraReportPeriodsFilter,
  ListAcaraStudentRecordsFilter,
  OverrideAcaraStudentRecordInput,
  UpdateAcaraReportPeriodInput,
} from "@/lib/validations/acara";
import {
  createAcaraReportPeriodSchema,
  exportAcaraStudentProfileSchema,
  listAcaraReportPeriodsSchema,
  listAcaraStudentRecordsSchema,
  overrideAcaraStudentRecordSchema,
  updateAcaraReportPeriodSchema,
} from "@/lib/validations/acara";

// ============================================================
// Dashboard
// ============================================================

export async function getAcaraDashboard(): Promise<
  ActionResponse<AcaraDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACARA_REPORTING);
    const db = await createSupabaseServerClient();

    const { data: periods, error } = await db
      .from("acara_report_periods")
      .select(
        `
        *,
        acara_student_records(
          id,
          attendance_rate
        )
      `,
      )
      .eq("tenant_id", ctx.tenant.id)
      .order("calendar_year", { ascending: false })
      .order("collection_type");

    if (error) return failure(error.message, "DB_ERROR");

    const enriched: AcaraReportPeriodWithCounts[] = (periods ?? []).map((p) => {
      const records = (p.acara_student_records ?? []) as Array<{
        id: string;
        attendance_rate: number;
      }>;
      const total = records.length;
      const below85 = records.filter((r) => r.attendance_rate < 85).length;
      const below70 = records.filter((r) => r.attendance_rate < 70).length;
      const avg =
        total > 0
          ? Math.round(
              (records.reduce((sum, r) => sum + (r.attendance_rate ?? 0), 0) /
                total) *
                100,
            ) / 100
          : 0;

      return {
        ...p,
        acara_student_records: undefined,
        total_students: total,
        students_below_85: below85,
        students_below_70: below70,
        avg_attendance_rate: avg,
      } as AcaraReportPeriodWithCounts;
    });

    const currentYear = new Date().getFullYear();
    const latest = enriched[0] ?? null;

    return success<AcaraDashboardData>({
      periods: enriched,
      current_year: currentYear,
      latest_period: latest,
    });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Report Periods - CRUD
// ============================================================

export async function listAcaraReportPeriods(
  filter: ListAcaraReportPeriodsFilter = {},
): Promise<ActionResponse<AcaraReportPeriodWithCounts[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACARA_REPORTING);
    const parsed = listAcaraReportPeriodsSchema.safeParse(filter);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const db = await createSupabaseServerClient();
    let query = db
      .from("acara_report_periods")
      .select(`*, acara_student_records(id, attendance_rate)`)
      .eq("tenant_id", ctx.tenant.id)
      .order("calendar_year", { ascending: false });

    if (parsed.data.calendar_year) {
      query = query.eq("calendar_year", parsed.data.calendar_year);
    }
    if (parsed.data.status) {
      query = query.eq("status", parsed.data.status);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, "DB_ERROR");

    const enriched: AcaraReportPeriodWithCounts[] = (data ?? []).map((p) => {
      const records = (p.acara_student_records ?? []) as Array<{
        id: string;
        attendance_rate: number;
      }>;
      const total = records.length;
      const below85 = records.filter((r) => r.attendance_rate < 85).length;
      const below70 = records.filter((r) => r.attendance_rate < 70).length;
      const avg =
        total > 0
          ? Math.round(
              (records.reduce((sum, r) => sum + (r.attendance_rate ?? 0), 0) /
                total) *
                100,
            ) / 100
          : 0;
      return {
        ...p,
        acara_student_records: undefined,
        total_students: total,
        students_below_85: below85,
        students_below_70: below70,
        avg_attendance_rate: avg,
      } as AcaraReportPeriodWithCounts;
    });

    return success(enriched);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function getAcaraReportPeriod(
  id: string,
): Promise<ActionResponse<AcaraReportPeriodWithCounts>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACARA_REPORTING);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("acara_report_periods")
      .select(`*, acara_student_records(id, attendance_rate)`)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (error) return failure(error.message, "DB_ERROR");
    if (!data) return failure("Report period not found", "NOT_FOUND");

    const records = (data.acara_student_records ?? []) as Array<{
      id: string;
      attendance_rate: number;
    }>;
    const total = records.length;
    const below85 = records.filter((r) => r.attendance_rate < 85).length;
    const below70 = records.filter((r) => r.attendance_rate < 70).length;
    const avg =
      total > 0
        ? Math.round(
            (records.reduce((sum, r) => sum + (r.attendance_rate ?? 0), 0) /
              total) *
              100,
          ) / 100
        : 0;

    return success({
      ...data,
      acara_student_records: undefined,
      total_students: total,
      students_below_85: below85,
      students_below_70: below70,
      avg_attendance_rate: avg,
    } as AcaraReportPeriodWithCounts);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function createAcaraReportPeriod(
  input: CreateAcaraReportPeriodInput,
): Promise<ActionResponse<AcaraReportPeriod>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const parsed = createAcaraReportPeriodSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("acara_report_periods")
      .insert({
        tenant_id: ctx.tenant.id,
        calendar_year: parsed.data.calendar_year,
        collection_type: parsed.data.collection_type,
        period_start: parsed.data.period_start,
        period_end: parsed.data.period_end,
        notes: parsed.data.notes ?? null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "A report period for this year and collection type already exists",
          "ALREADY_EXISTS",
        );
      }
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_REPORT_PERIOD_CREATED,
      entityType: "acara_report_period",
      entityId: data.id,
      metadata: {
        calendar_year: parsed.data.calendar_year,
        collection_type: parsed.data.collection_type,
      },
    });

    return success(data as AcaraReportPeriod);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function updateAcaraReportPeriod(
  input: UpdateAcaraReportPeriodInput,
): Promise<ActionResponse<AcaraReportPeriod>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const parsed = updateAcaraReportPeriodSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { id, ...rest } = parsed.data;
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("acara_report_periods")
      .update(rest)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");
    if (!data) return failure("Report period not found", "NOT_FOUND");

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_REPORT_PERIOD_UPDATED,
      entityType: "acara_report_period",
      entityId: id,
      metadata: { changes: rest },
    });

    return success(data as AcaraReportPeriod);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function deleteAcaraReportPeriod(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("acara_report_periods")
      .delete()
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_REPORT_PERIOD_DELETED,
      entityType: "acara_report_period",
      entityId: id,
    });

    return success(undefined);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Student Records - List + Override
// ============================================================

export async function listAcaraStudentRecords(
  filter: ListAcaraStudentRecordsFilter,
): Promise<ActionResponse<AcaraStudentRecordWithStudent[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACARA_REPORTING);
    const parsed = listAcaraStudentRecordsSchema.safeParse(filter);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const db = await createSupabaseServerClient();
    let query = db
      .from("acara_student_records")
      .select(
        `
        *,
        student:students(id, first_name, last_name, dob, indigenous_status, language_background)
      `,
      )
      .eq("report_period_id", parsed.data.report_period_id)
      .eq("tenant_id", ctx.tenant.id)
      .order("attendance_rate", { ascending: true });

    if (parsed.data.below_threshold !== undefined) {
      query = query.lt("attendance_rate", parsed.data.below_threshold);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, "DB_ERROR");

    let records = (data ?? []) as AcaraStudentRecordWithStudent[];

    if (parsed.data.search) {
      const q = parsed.data.search.toLowerCase();
      records = records.filter(
        (r) =>
          r.student.first_name.toLowerCase().includes(q) ||
          r.student.last_name.toLowerCase().includes(q),
      );
    }

    return success(records);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function overrideAcaraStudentRecord(
  input: OverrideAcaraStudentRecordInput,
): Promise<ActionResponse<AcaraStudentRecord>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const parsed = overrideAcaraStudentRecordSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { id, ...rest } = parsed.data;
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("acara_student_records")
      .update({ ...rest, manually_overridden: true })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");
    if (!data) return failure("Student record not found", "NOT_FOUND");

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_STUDENT_RECORD_OVERRIDDEN,
      entityType: "acara_student_record",
      entityId: id,
      metadata: { reason: rest.override_notes },
    });

    return success(data as AcaraStudentRecord);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Sync - Pull attendance_records → compute summaries
// ============================================================

export async function syncAcaraStudentRecords(
  reportPeriodId: string,
): Promise<ActionResponse<{ synced: number; skipped: number }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const db = await createSupabaseServerClient();

    // Fetch the report period so we know the date range
    const { data: period, error: periodErr } = await db
      .from("acara_report_periods")
      .select("*")
      .eq("id", reportPeriodId)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (periodErr || !period)
      return failure("Report period not found", "NOT_FOUND");

    if (period.status === "submitted") {
      return failure("Cannot sync a submitted report", "FORBIDDEN");
    }

    // Pull all attendance records in the date range for this tenant
    const { data: attendanceRows, error: attErr } = await db
      .from("attendance_records")
      .select("student_id, date, status, notes")
      .eq("tenant_id", ctx.tenant.id)
      .gte("date", period.period_start)
      .lte("date", period.period_end)
      .is("deleted_at", null);

    if (attErr) return failure(attErr.message, "DB_ERROR");

    // Group by student
    const byStudent = new Map<
      string,
      Array<{ date: string; status: string; notes: string | null }>
    >();
    for (const row of attendanceRows ?? []) {
      if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
      byStudent.get(row.student_id)!.push(row);
    }

    // Compute per-student summary
    const upsertRows = Array.from(byStudent.entries()).map(
      ([studentId, rows]) => {
        let possible = 0;
        let actual = 0;
        let unexplained = 0;
        let absentExplained = 0;
        let lateDays = 0;
        let exemptDays = 0;

        for (const r of rows) {
          possible += 1;
          if (r.status === "present") {
            actual += 1;
          } else if (r.status === "half_day") {
            actual += 0.5;
            possible -= 0.5; // half-day = 0.5 possible
          } else if (r.status === "late") {
            actual += 1;
            lateDays += 1;
          } else if (r.status === "excused") {
            exemptDays += 1;
            absentExplained += 1;
          } else if (r.status === "absent") {
            if (r.notes && r.notes.trim().length > 0) {
              absentExplained += 1;
            } else {
              unexplained += 1;
            }
          }
        }

        return {
          tenant_id: ctx.tenant.id,
          report_period_id: reportPeriodId,
          student_id: studentId,
          possible_days: possible,
          actual_days: actual,
          unexplained_days: unexplained,
          absent_explained: absentExplained,
          late_days: lateDays,
          exempt_days: exemptDays,
          last_synced_at: new Date().toISOString(),
          manually_overridden: false,
        };
      },
    );

    if (upsertRows.length === 0) {
      return success({ synced: 0, skipped: 0 });
    }

    // Skip manually overridden records
    const { data: existing } = await db
      .from("acara_student_records")
      .select("student_id, manually_overridden")
      .eq("report_period_id", reportPeriodId)
      .eq("tenant_id", ctx.tenant.id);

    const overriddenSet = new Set(
      (existing ?? [])
        .filter(
          (r: { student_id: string; manually_overridden: boolean }) =>
            r.manually_overridden,
        )
        .map(
          (r: { student_id: string; manually_overridden: boolean }) =>
            r.student_id,
        ),
    );

    const toUpsert = upsertRows.filter((r) => !overriddenSet.has(r.student_id));
    const skipped = upsertRows.length - toUpsert.length;

    if (toUpsert.length > 0) {
      const { error: upsertErr } = await db
        .from("acara_student_records")
        .upsert(toUpsert, {
          onConflict: "tenant_id,report_period_id,student_id",
        });

      if (upsertErr) return failure(upsertErr.message, "DB_ERROR");
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_RECORDS_SYNCED,
      entityType: "acara_report_period",
      entityId: reportPeriodId,
      metadata: { synced: toUpsert.length, skipped },
    });

    return success({ synced: toUpsert.length, skipped });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Verify + Status transitions
// ============================================================

export async function setAcaraReportStatus(
  id: string,
  status: "verified" | "submitted",
): Promise<ActionResponse<AcaraReportPeriod>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const db = await createSupabaseServerClient();

    const update: Record<string, unknown> = { status };
    if (status === "submitted") {
      update.submitted_at = new Date().toISOString();
      update.submitted_by = ctx.user.id;
    }

    const { data, error } = await db
      .from("acara_report_periods")
      .update(update)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");
    if (!data) return failure("Report period not found", "NOT_FOUND");

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_REPORT_STATUS_CHANGED,
      entityType: "acara_report_period",
      entityId: id,
      metadata: { status },
    });

    return success(data as AcaraReportPeriod);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Export - CSV in ACARA ASC format
// ============================================================

export async function exportAcaraReportCsv(
  reportPeriodId: string,
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const db = await createSupabaseServerClient();

    // Fetch period
    const { data: period, error: pErr } = await db
      .from("acara_report_periods")
      .select("*")
      .eq("id", reportPeriodId)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (pErr || !period) return failure("Report period not found", "NOT_FOUND");

    // Fetch records with student info
    const { data: records, error: rErr } = await db
      .from("acara_student_records")
      .select(
        `*, student:students(id, first_name, last_name, dob, indigenous_status, language_background, crn)`,
      )
      .eq("report_period_id", reportPeriodId)
      .eq("tenant_id", ctx.tenant.id)
      .order("attendance_rate", { ascending: true });

    if (rErr) return failure(rErr.message, "DB_ERROR");

    // Build CSV in ACARA ASC recommended format
    const headers = [
      "StudentID",
      "FirstName",
      "LastName",
      "DOB",
      "IndigenousStatus",
      "LanguageBackground",
      "CRN",
      "PossibleDays",
      "ActualDays",
      "AbsentExplained",
      "AbsentUnexplained",
      "LateDays",
      "ExemptDays",
      "AttendanceRate",
      "ManuallyOverridden",
    ];

    const rows = (records ?? []).map((r) => {
      const s = r.student as {
        id: string;
        first_name: string;
        last_name: string;
        dob: string | null;
        indigenous_status: string | null;
        language_background: string | null;
        crn: string | null;
      };
      return [
        s.id,
        `"${s.first_name}"`,
        `"${s.last_name}"`,
        s.dob ?? "",
        s.indigenous_status ?? "not_stated",
        s.language_background ?? "not_stated",
        s.crn ?? "",
        r.possible_days,
        r.actual_days,
        r.absent_explained,
        r.unexplained_days,
        r.late_days,
        r.exempt_days,
        r.attendance_rate,
        r.manually_overridden ? "Y" : "N",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `acara_attendance_${period.calendar_year}_${period.collection_type}_${new Date().toISOString().split("T")[0]}.csv`;

    // Mark as exported
    await db
      .from("acara_report_periods")
      .update({
        status: period.status === "draft" ? "exported" : period.status,
        exported_at: new Date().toISOString(),
        exported_by: ctx.user.id,
      })
      .eq("id", reportPeriodId)
      .eq("tenant_id", ctx.tenant.id);

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_REPORT_EXPORTED,
      entityType: "acara_report_period",
      entityId: reportPeriodId,
      metadata: {
        filename,
        row_count: records?.length ?? 0,
        calendar_year: period.calendar_year,
      },
    });

    return success({ csv, filename });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Export - Student demographic profile CSV (ACARA ASC)
// ============================================================
// Produces a standalone CSV with all ACARA-required demographic
// fields: ATSI, LBOTE, SES (parent education + occupation),
// disability flag (computed from NCCD register), postcode, etc.
// The disability flag is NEVER stored - always derived at export
// time from nccd_register_entries for the given calendar year.
// ============================================================

export async function exportAcaraStudentProfileCsv(
  input: ExportAcaraStudentProfileInput,
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACARA_REPORTING);
    const parsed = exportAcaraStudentProfileSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        "VALIDATION_ERROR",
      );
    }

    const db = await createSupabaseServerClient();
    const year = parsed.data.calendar_year;
    const statusFilter = parsed.data.enrollment_status ?? "active";

    // 1. Fetch students with enrollment → class for cycle_level
    const { data: students, error: sErr } = await db
      .from("students")
      .select(
        `id, first_name, last_name, dob, gender,
         indigenous_status, language_background,
         country_of_birth, home_language,
         parent_education_level, parent_occupation_group,
         residential_address, crn,
         enrollments(class_id, status, classes(cycle_level))`,
      )
      .eq("tenant_id", ctx.tenant.id)
      .eq("enrollment_status", statusFilter)
      .is("deleted_at", null)
      .order("last_name", { ascending: true });

    if (sErr) return failure(sErr.message, "DB_ERROR");

    // 2. Batch-fetch NCCD disability flags for the calendar year
    let nccdStudentIds = new Set<string>();
    if (parsed.data.include_disability_flag) {
      const { data: nccdEntries } = await db
        .from("nccd_register_entries")
        .select("student_id")
        .eq("tenant_id", ctx.tenant.id)
        .eq("collection_year", year)
        .eq("status", "active")
        .is("deleted_at", null);

      nccdStudentIds = new Set(
        (nccdEntries ?? []).map((e: { student_id: string }) => e.student_id),
      );
    }

    // 3. Build CSV
    const headers = [
      "StudentID",
      "FirstName",
      "LastName",
      "DOB",
      "Gender",
      "YearLevel",
      "IndigenousStatus",
      "LanguageBackground",
      "CountryOfBirth",
      "HomeLanguage",
      "ParentEducation",
      "ParentOccupation",
      "DisabilityFlag",
      "ResidentialPostcode",
      "CRN",
    ];

    const escapeCsv = (v: string) => {
      if (v.includes(",") || v.includes('"') || v.includes("\n")) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };

    const rows = (students ?? []).map((s) => {
      // Extract cycle_level from first active enrollment's class
      // Supabase joins return arrays - classes is an array even for a single FK
      const enrollments = (s.enrollments ?? []) as unknown as Array<{
        status: string;
        classes: Array<{ cycle_level: string | null }>;
      }>;
      const activeEnrollment = enrollments.find((e) => e.status === "active");
      const yearLevel = activeEnrollment?.classes?.[0]?.cycle_level ?? "";

      // Extract postcode from JSONB residential_address
      const addr = s.residential_address as {
        postcode?: string;
      } | null;
      const postcode = addr?.postcode ?? "";

      return [
        s.id,
        escapeCsv(s.first_name),
        escapeCsv(s.last_name),
        s.dob ?? "",
        s.gender ?? "",
        escapeCsv(yearLevel),
        s.indigenous_status ?? "not_stated",
        s.language_background ?? "not_stated",
        escapeCsv(s.country_of_birth ?? ""),
        escapeCsv(s.home_language ?? ""),
        s.parent_education_level ?? "not_stated",
        s.parent_occupation_group ?? "not_stated",
        nccdStudentIds.has(s.id) ? "Y" : "N",
        postcode,
        s.crn ?? "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `acara_student_profile_${year}_${new Date().toISOString().split("T")[0]}.csv`;

    await logAudit({
      context: ctx,
      action: AuditActions.ACARA_STUDENT_PROFILE_EXPORTED,
      entityType: "acara_export",
      entityId: `profile_${year}`,
      metadata: {
        calendar_year: year,
        enrollment_status: statusFilter,
        row_count: rows.length,
        include_disability_flag: parsed.data.include_disability_flag,
      },
    });

    return success({ csv, filename });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}
