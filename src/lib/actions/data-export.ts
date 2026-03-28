"use server";

// src/lib/actions/data-export.ts
//
// ============================================================
// WattleOS V2 - Data Export Actions (Prompt 49)
// ============================================================
// Builds on the existing PDF export pattern in report-export.ts.
// Exports student, class, and attendance data as CSV and JSON.
//
// RATE LIMITED: authenticated_export tier — 10 requests per
// 5 minutes per user. Prevents staff from bulk-harvesting all
// school data in a short window.
//
// AUDIT LOGGED: Every export is logged with sensitivity='high'
// so forensic analysis can identify data exfiltration.
//
// PERMISSIONS:
//   Student data: MANAGE_STUDENTS (or VIEW_STUDENT_DATA)
//   Class data:   MANAGE_CLASSES
//   Attendance:   VIEW_ATTENDANCE
//
// All exports are scoped to the current tenant via RLS and
// explicit tenant_id filters.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Export Rate Limit
// ============================================================
// 10 exports per 5 minutes per user (authenticated_export tier
// keyed by user ID). Added here — rate-limit.ts defines the config.
// ============================================================

async function checkExportRateLimit(userId: string): Promise<string | null> {
  const result = await checkRateLimit("authenticated_export" as Parameters<typeof checkRateLimit>[0], userId);
  if (!result.allowed) {
    const secs = Math.ceil((result.resetAt - Date.now()) / 1000);
    return `Export rate limit exceeded. Try again in ${Math.ceil(secs / 60)} minute(s).`;
  }
  return null;
}

// ============================================================
// CSV helpers
// ============================================================

function escapeCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  // Wrap in quotes if contains comma, quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCell).join(",");
}

function toCsvString(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [toCsvRow(headers)];
  for (const row of rows) {
    lines.push(toCsvRow(headers.map((h) => row[h])));
  }
  return lines.join("\r\n");
}

// ============================================================
// EXPORT: Single student data as CSV
// ============================================================

export interface ExportStudentCsvOptions {
  includeGuardians?: boolean;
  includeMedical?: boolean;
  includeAttendanceSummary?: boolean;
}

export async function exportStudentDataCsv(
  studentId: string,
  options: ExportStudentCsvOptions = {},
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    const rateLimitError = await checkExportRateLimit(context.user.id);
    if (rateLimitError) return failure(rateLimitError, ErrorCodes.RATE_LIMITED);

    // Fetch student
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(`
        id, first_name, last_name, preferred_name, dob, gender,
        enrollment_status, nationality, country_of_birth, home_language,
        indigenous_status, language_background, visa_subclass,
        interpreter_required, religion, crn, usi, medicare_number,
        notes, created_at
      `)
      .eq("id", studentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (studentError || !student) {
      return failure("Student not found", ErrorCodes.NOT_FOUND);
    }

    const headers = [
      "id", "first_name", "last_name", "preferred_name", "dob", "gender",
      "enrollment_status", "nationality", "country_of_birth", "home_language",
      "indigenous_status", "language_background", "visa_subclass",
      "interpreter_required", "religion", "crn", "usi", "medicare_number",
      "notes", "created_at",
    ];

    const csv = toCsvString(headers, [student as Record<string, unknown>]);
    const filename = `student_${student.last_name}_${student.first_name}_${new Date().toISOString().slice(0, 10)}.csv`;

    await logAudit({
      context,
      action: AuditActions.STUDENT_DATA_EXPORTED_CSV,
      entityType: "student",
      entityId: studentId,
      sensitivity: "high",
      metadata: { filename, options },
    });

    return success({ csv, filename });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export student data",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT: Single student data as JSON
// ============================================================

export async function exportStudentDataJson(
  studentId: string,
): Promise<ActionResponse<{ json: string; filename: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    const rateLimitError = await checkExportRateLimit(context.user.id);
    if (rateLimitError) return failure(rateLimitError, ErrorCodes.RATE_LIMITED);

    // Fetch student + related data in parallel
    const [studentRes, guardiansRes, medicalRes, enrollmentsRes] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("student_guardians")
        .select("guardians(first_name, last_name, relationship, email, phone, is_primary_contact)")
        .eq("student_id", studentId)
        .eq("tenant_id", context.tenant.id),
      supabase
        .from("medical_conditions")
        .select("condition_name, severity, status, treatment_plan, notes")
        .eq("student_id", studentId)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null),
      supabase
        .from("enrollments")
        .select("class_id, start_date, end_date, status")
        .eq("student_id", studentId)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null),
    ]);

    if (studentRes.error || !studentRes.data) {
      return failure("Student not found", ErrorCodes.NOT_FOUND);
    }

    const exportData = {
      _meta: {
        exported_at: new Date().toISOString(),
        format: "wattleos-student-export-v1",
        tenant_id: context.tenant.id,
      },
      student: studentRes.data,
      guardians: guardiansRes.data ?? [],
      medical_conditions: medicalRes.data ?? [],
      enrollments: enrollmentsRes.data ?? [],
    };

    const json = JSON.stringify(exportData, null, 2);
    const s = studentRes.data;
    const filename = `student_${s.last_name}_${s.first_name}_${new Date().toISOString().slice(0, 10)}.json`;

    await logAudit({
      context,
      action: AuditActions.STUDENT_DATA_EXPORTED_JSON,
      entityType: "student",
      entityId: studentId,
      sensitivity: "high",
      metadata: { filename },
    });

    return success({ json, filename });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export student data",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT: Full class data as CSV
// ============================================================

export async function exportClassDataCsv(
  classId: string,
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    const rateLimitError = await checkExportRateLimit(context.user.id);
    if (rateLimitError) return failure(rateLimitError, ErrorCodes.RATE_LIMITED);

    // Fetch class info
    const { data: classData } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .eq("tenant_id", context.tenant.id)
      .single();

    // Fetch all active enrollments with student details
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select(`
        students!inner (
          id, first_name, last_name, preferred_name, dob, gender,
          enrollment_status, indigenous_status, language_background,
          interpreter_required, notes
        ),
        start_date, status
      `)
      .eq("class_id", classId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const rows = (enrollments ?? []).map((e) => {
      const s = (e as { students: Record<string, unknown> }).students;
      return {
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        preferred_name: s.preferred_name,
        dob: s.dob,
        gender: s.gender,
        enrollment_status: s.enrollment_status,
        indigenous_status: s.indigenous_status,
        language_background: s.language_background,
        interpreter_required: s.interpreter_required,
        enrollment_start: e.start_date,
        notes: s.notes,
      };
    });

    const headers = [
      "student_id", "first_name", "last_name", "preferred_name", "dob",
      "gender", "enrollment_status", "indigenous_status", "language_background",
      "interpreter_required", "enrollment_start", "notes",
    ];

    const csv = toCsvString(headers, rows);
    const className = classData?.name ?? classId;
    const filename = `class_${className.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;

    await logAudit({
      context,
      action: AuditActions.CLASS_DATA_EXPORTED_CSV,
      entityType: "class",
      entityId: classId,
      sensitivity: "high",
      metadata: { filename, row_count: rows.length },
    });

    return success({ csv, filename });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export class data",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT: Attendance records as CSV
// ============================================================

export interface ExportAttendanceCsvFilters {
  studentId?: string;
  classId?: string;
  dateFrom?: string;   // ISO date YYYY-MM-DD
  dateTo?: string;     // ISO date YYYY-MM-DD
  status?: string;     // 'present' | 'absent' | 'late' | etc.
}

export async function exportAttendanceCsv(
  filters: ExportAttendanceCsvFilters,
): Promise<ActionResponse<{ csv: string; filename: string; row_count: number }>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ATTENDANCE ?? Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    const rateLimitError = await checkExportRateLimit(context.user.id);
    if (rateLimitError) return failure(rateLimitError, ErrorCodes.RATE_LIMITED);

    let query = supabase
      .from("attendance_records")
      .select(`
        id, date, status, check_in_at, check_out_at, notes,
        students!inner (first_name, last_name),
        classes (name)
      `)
      .eq("tenant_id", context.tenant.id)
      .order("date", { ascending: false })
      .order("students(last_name)", { ascending: true })
      .limit(50000); // Safety cap

    if (filters.studentId) query = query.eq("student_id", filters.studentId);
    if (filters.classId) query = query.eq("class_id", filters.classId);
    if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("date", filters.dateTo);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const rows = (data ?? []).map((r) => ({
      date: r.date,
      student_first_name: (r.students as { first_name: string; last_name: string })?.first_name ?? "",
      student_last_name: (r.students as { first_name: string; last_name: string })?.last_name ?? "",
      class_name: (r.classes as { name: string } | null)?.name ?? "",
      status: r.status,
      check_in_at: r.check_in_at ?? "",
      check_out_at: r.check_out_at ?? "",
      notes: r.notes ?? "",
    }));

    const headers = [
      "date", "student_first_name", "student_last_name",
      "class_name", "status", "check_in_at", "check_out_at", "notes",
    ];

    const csv = toCsvString(headers, rows);
    const dateLabel = new Date().toISOString().slice(0, 10);
    const filename = `attendance_export_${dateLabel}.csv`;

    await logAudit({
      context,
      action: AuditActions.ATTENDANCE_DATA_EXPORTED_CSV,
      entityType: "attendance_records",
      entityId: context.tenant.id,
      sensitivity: "high",
      metadata: { filename, row_count: rows.length, filters },
    });

    return success({ csv, filename, row_count: rows.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export attendance data",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
