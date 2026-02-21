'use server';

// src/lib/actions/parent/attendance.ts
//
// ============================================================
// WattleOS V2 - Parent Portal: Attendance Actions
// ============================================================
// Fetches attendance records for a parent's child. Read-only
// view - parents can see but not modify attendance.
//
// WHY separate from staff attendance: Parents see a simplified
// view without class-level aggregation or recording controls.
// ============================================================

"use server";

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import type { AttendanceStatus } from "@/types/domain";
import { isGuardianOf } from "./children";

// ============================================================
// Types
// ============================================================

export interface ChildAttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
}

export interface ChildAttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  attendanceRate: number;
}

export interface ChildAttendanceResponse {
  records: ChildAttendanceRecord[];
  summary: ChildAttendanceSummary;
}

// ============================================================
// getChildAttendance - records + summary for a date range
// ============================================================

export async function getChildAttendance(
  studentId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
  },
): Promise<ActionResponse<ChildAttendanceResponse>> {
  try {
    const context = await getTenantContext();

    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return {
        data: null,
        error: { message: "Not authorized", code: "FORBIDDEN" },
      };
    }

    const supabase = await createSupabaseServerClient();
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 50;
    const offset = (page - 1) * perPage;

    // Default to current term (last 90 days if no dates provided)
    const endDate = params?.endDate ?? new Date().toISOString().split("T")[0];
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 90);
    const startDate =
      params?.startDate ?? defaultStart.toISOString().split("T")[0];

    // Fetch records
    let query = supabase
      .from("attendance_records")
      .select("id, date, status, check_in_at, check_out_at, notes")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null)
      .order("date", { ascending: false });

    // Paginate
    query = query.range(offset, offset + perPage - 1);

    const { data, error } = await query;

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: "QUERY_ERROR" },
      };
    }

    const records: ChildAttendanceRecord[] = (data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status as AttendanceStatus,
      checkInAt: r.check_in_at,
      checkOutAt: r.check_out_at,
      notes: r.notes,
    }));

    // Summary for the full date range (not paginated)
    const { data: allRecords } = await supabase
      .from("attendance_records")
      .select("status")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null);

    const all = allRecords ?? [];
    const totalDays = all.length;
    const present = all.filter((r) => r.status === "present").length;
    const absent = all.filter((r) => r.status === "absent").length;
    const late = all.filter((r) => r.status === "late").length;
    const excused = all.filter((r) => r.status === "excused").length;
    const halfDay = all.filter((r) => r.status === "half_day").length;
    const attendanceRate =
      totalDays > 0
        ? Math.round(((present + late + halfDay) / totalDays) * 100)
        : 0;

    return {
      data: {
        records,
        summary: {
          totalDays,
          present,
          absent,
          late,
          excused,
          halfDay,
          attendanceRate,
        },
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}

// ============================================================
// getChildAttendanceWeek - current week at a glance
// ============================================================

export async function getChildAttendanceWeek(
  studentId: string,
): Promise<ActionResponse<ChildAttendanceRecord[]>> {
  try {
    const context = await getTenantContext();

    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return {
        data: null,
        error: { message: "Not authorized", code: "FORBIDDEN" },
      };
    }

    const supabase = await createSupabaseServerClient();

    // Get Monday of current week
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const mondayStr = monday.toISOString().split("T")[0];

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const fridayStr = friday.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("attendance_records")
      .select("id, date, status, check_in_at, check_out_at, notes")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .gte("date", mondayStr)
      .lte("date", fridayStr)
      .is("deleted_at", null)
      .order("date", { ascending: true });

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: "QUERY_ERROR" },
      };
    }

    return {
      data: (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status as AttendanceStatus,
        checkInAt: r.check_in_at,
        checkOutAt: r.check_out_at,
        notes: r.notes,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}
