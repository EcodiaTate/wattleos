// src/lib/actions/attendance.ts
//
// ============================================================
// WattleOS V2 - Attendance Server Actions
// ============================================================
// All attendance mutations and queries. Uses upsert pattern
// for markAttendance since there's a UNIQUE(tenant_id, student_id, date)
// constraint - marking the same student twice on the same day
// updates the existing record rather than failing.
//
// WHY upsert: Roll call is a "tap to toggle" UI. The guide taps
// Present, then realizes the student is Late, and taps again.
// Upsert makes this idempotent without requiring the UI to know
// if a record already exists.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ActionResponse,
  failure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Student,
} from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface MarkAttendanceInput {
  studentId: string;
  classId?: string;
  date: string; // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
}

export interface BulkMarkAttendanceInput {
  classId: string;
  date: string; // ISO date string YYYY-MM-DD
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    notes?: string | null;
  }>;
}

// ============================================================
// Compound types for UI
// ============================================================

/** Student row enriched with their attendance status for a given date */
export interface StudentAttendanceRow {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  record: AttendanceRecord | null;
  /** Critical medical conditions surfaced in roll call */
  medicalAlerts: Array<{
    condition_name: string;
    severity: string;
  }>;
}

/** Daily summary stats */
export interface AttendanceDaySummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
}

/** Absence report row */
export interface AbsenceReportRow {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  hasExplanation: boolean;
}

// ============================================================
// MARK: Single student attendance (upsert)
// ============================================================

export async function markAttendance(
  input: MarkAttendanceInput,
): Promise<ActionResponse<AttendanceRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    if (!input.studentId)
      return failure("Student is required", "VALIDATION_ERROR");
    if (!input.date) return failure("Date is required", "VALIDATION_ERROR");
    if (!input.status) return failure("Status is required", "VALIDATION_ERROR");

    // Upsert: insert or update if record exists for this student+date
    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        {
          tenant_id: context.tenant.id,
          student_id: input.studentId,
          class_id: input.classId ?? null,
          date: input.date,
          status: input.status,
          check_in_at: input.checkInAt ?? null,
          check_out_at: input.checkOutAt ?? null,
          notes: input.notes ?? null,
          recorded_by: context.user.id,
          deleted_at: null, // un-soft-delete if re-marking
        },
        {
          onConflict: "tenant_id,student_id,date",
        },
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as AttendanceRecord);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark attendance";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// BULK MARK: Entire class for a date (roll call submit)
// ============================================================

export async function bulkMarkAttendance(
  input: BulkMarkAttendanceInput,
): Promise<ActionResponse<{ marked: number; errors: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    if (!input.classId) return failure("Class is required", "VALIDATION_ERROR");
    if (!input.date) return failure("Date is required", "VALIDATION_ERROR");
    if (input.records.length === 0)
      return failure("No records to mark", "VALIDATION_ERROR");

    const rows = input.records.map((r) => ({
      tenant_id: context.tenant.id,
      student_id: r.studentId,
      class_id: input.classId,
      date: input.date,
      status: r.status,
      notes: r.notes ?? null,
      recorded_by: context.user.id,
      deleted_at: null,
    }));

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(rows, {
        onConflict: "tenant_id,student_id,date",
      })
      .select();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({
      marked: data?.length ?? 0,
      errors: input.records.length - (data?.length ?? 0),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to bulk mark attendance";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: Class attendance for a single date (roll call view)
// ============================================================
// Returns all actively enrolled students in the class, each
// paired with their attendance record (if any) for that date,
// plus any critical medical alerts.

export async function getClassAttendance(
  classId: string,
  date: string,
): Promise<ActionResponse<StudentAttendanceRow[]>> {
  try {
    await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    // 1. Get active enrollments for this class
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select(
        "student_id, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("class_id", classId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (enrollError) {
      return failure(enrollError.message, "DB_ERROR");
    }

    const studentRows = (enrollments ?? [])
      .filter((e) => (e as Record<string, unknown>).student)
      .map((e) => {
        const student = (e as Record<string, unknown>).student as Pick<
          Student,
          "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
        >;
        return { studentId: e.student_id as string, student };
      });

    if (studentRows.length === 0) {
      return success([]);
    }

    const studentIds = studentRows.map((s) => s.studentId);

    // 2. Get existing attendance records for these students on this date
    const { data: records, error: recError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", date)
      .in("student_id", studentIds)
      .is("deleted_at", null);

    if (recError) {
      return failure(recError.message, "DB_ERROR");
    }

    const recordMap = new Map<string, AttendanceRecord>();
    for (const r of (records ?? []) as AttendanceRecord[]) {
      recordMap.set(r.student_id, r);
    }

    // 3. Get critical medical conditions (severe + life_threatening)
    const { data: medicals } = await supabase
      .from("medical_conditions")
      .select("student_id, condition_name, severity")
      .in("student_id", studentIds)
      .in("severity", ["severe", "life_threatening"])
      .is("deleted_at", null);

    const medicalMap = new Map<
      string,
      Array<{ condition_name: string; severity: string }>
    >();
    for (const m of (medicals ?? []) as Array<{
      student_id: string;
      condition_name: string;
      severity: string;
    }>) {
      if (!medicalMap.has(m.student_id)) medicalMap.set(m.student_id, []);
      medicalMap.get(m.student_id)!.push({
        condition_name: m.condition_name,
        severity: m.severity,
      });
    }

    // 4. Assemble rows, sorted by last name
    const rows: StudentAttendanceRow[] = studentRows
      .map((s) => ({
        student: s.student,
        record: recordMap.get(s.studentId) ?? null,
        medicalAlerts: medicalMap.get(s.studentId) ?? [],
      }))
      .sort((a, b) => a.student.last_name.localeCompare(b.student.last_name));

    return success(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get class attendance";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: Student attendance history (paginated, date range)
// ============================================================

export async function getStudentAttendanceHistory(params: {
  studentId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}): Promise<PaginatedResponse<AttendanceRecord>> {
  try {
    await getTenantContext(); // RLS handles parent vs staff access
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQuery = supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("student_id", params.studentId)
      .is("deleted_at", null);

    let dataQuery = supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", params.studentId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .range(from, to);

    if (params.startDate) {
      countQuery = countQuery.gte("date", params.startDate);
      dataQuery = dataQuery.gte("date", params.startDate);
    }
    if (params.endDate) {
      countQuery = countQuery.lte("date", params.endDate);
      dataQuery = dataQuery.lte("date", params.endDate);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: countError.message, code: "DB_ERROR" },
      };
    }

    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: dataError.message, code: "DB_ERROR" },
      };
    }

    return {
      data: (data ?? []) as AttendanceRecord[],
      pagination: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get attendance history";
    return {
      data: [],
      pagination: { total: 0, page: 1, per_page: 30, total_pages: 0 },
      error: { message, code: "UNEXPECTED_ERROR" },
    };
  }
}

// ============================================================
// GET: Attendance summary for a class over a date range
// ============================================================

export async function getAttendanceSummary(params: {
  classId: string;
  startDate: string;
  endDate: string;
}): Promise<ActionResponse<AttendanceDaySummary[]>> {
  try {
    await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("attendance_records")
      .select("date, status")
      .eq("class_id", params.classId)
      .gte("date", params.startDate)
      .lte("date", params.endDate)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    // Aggregate by date
    const dayMap = new Map<string, AttendanceDaySummary>();

    type AttendanceCountKey = Exclude<
      keyof AttendanceDaySummary,
      "date" | "total"
    >;

    const isAttendanceCountKey = (v: string): v is AttendanceCountKey =>
      v === "present" ||
      v === "absent" ||
      v === "late" ||
      v === "excused" ||
      v === "half_day";

    for (const row of (data ?? []) as Array<{ date: string; status: string }>) {
      if (!dayMap.has(row.date)) {
        dayMap.set(row.date, {
          date: row.date,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          half_day: 0,
        });
      }

      const summary = dayMap.get(row.date)!;
      summary.total += 1;

      if (isAttendanceCountKey(row.status)) {
        summary[row.status] += 1;
      }
    }

    // Sort by date descending
    const summaries = Array.from(dayMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    return success(summaries);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get attendance summary";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: Absence report (unexplained absences)
// ============================================================

export async function getAbsenceReport(params: {
  classId?: string;
  startDate: string;
  endDate: string;
  unexplainedOnly?: boolean;
}): Promise<ActionResponse<AbsenceReportRow[]>> {
  try {
    await requirePermission(Permissions.VIEW_ATTENDANCE_REPORTS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("attendance_records")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .in("status", ["absent", "late"])
      .gte("date", params.startDate)
      .lte("date", params.endDate)
      .is("deleted_at", null)
      .order("date", { ascending: false });

    if (params.classId) {
      query = query.eq("class_id", params.classId);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    let rows: AbsenceReportRow[] = (
      (data ?? []) as Array<Record<string, unknown>>
    )
      .filter((r) => r.student)
      .map((r) => ({
        student: r.student as Pick<
          Student,
          "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
        >,
        date: r.date as string,
        status: r.status as AttendanceStatus,
        notes: (r.notes as string) ?? null,
        hasExplanation: !!(r.notes as string | null)?.trim(),
      }));

    if (params.unexplainedOnly) {
      rows = rows.filter((r) => !r.hasExplanation);
    }

    return success(rows);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get absence report";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// CHECK IN / CHECK OUT helpers
// ============================================================

export async function checkInStudent(
  studentId: string,
  date: string,
): Promise<ActionResponse<AttendanceRecord>> {
  return markAttendance({
    studentId,
    date,
    status: "present",
    checkInAt: new Date().toISOString(),
  });
}

export async function checkOutStudent(
  studentId: string,
  date: string,
): Promise<ActionResponse<AttendanceRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    // Find existing record for today
    const { data: existing, error: findError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", date)
      .is("deleted_at", null)
      .single();

    if (findError || !existing) {
      return failure(
        "No attendance record found for this student today",
        "NOT_FOUND",
      );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        check_out_at: new Date().toISOString(),
        recorded_by: context.user.id,
      })
      .eq("id", (existing as AttendanceRecord).id)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as AttendanceRecord);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check out student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
