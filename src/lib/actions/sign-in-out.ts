"use server";

// src/lib/actions/sign-in-out.ts
//
// ============================================================
// WattleOS V2 - Sign-In/Out Kiosk Server Actions
// ============================================================
// Handles late arrivals and early departures recorded at the
// school-day kiosk (reception tablet or staff device).
//
// ON CREATE:
//   1. Insert sign_in_out_records row
//   2. Upsert attendance_records:
//        late_arrival  → status='late',     check_in_at=occurred_at
//        early_depart  → check_out_at=occurred_at
//                        status updated to 'half_day' if was present/late
//
// WHY update attendance_records too: Roll call and kiosk are
// two views of the same truth. A late child should show as
// "Late" in the roll-call view, not just in the kiosk log.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  CreateSignInOutSchema,
  ListSignInOutSchema,
  type CreateSignInOutInput,
  type ListSignInOutInput,
} from "@/lib/validations/sign-in-out";
import {
  ActionResponse,
  failure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  AttendanceRecord,
  SignInOutDashboardData,
  SignInOutRecord,
  SignInOutRecordWithStudent,
  Student,
} from "@/types/domain";

// ============================================================
// CREATE: Record a kiosk sign-in/out event
// ============================================================

export async function createSignInOutRecord(
  input: CreateSignInOutInput,
): Promise<ActionResponse<SignInOutRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    // Validate
    const parsed = CreateSignInOutSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    // 1. Insert the kiosk record
    const { data: record, error: insertError } = await supabase
      .from("sign_in_out_records")
      .insert({
        tenant_id: context.tenant.id,
        student_id: data.studentId,
        type: data.type,
        event_date: data.eventDate,
        occurred_at: data.occurredAt,
        reason_code: data.reasonCode,
        reason_notes: data.reasonNotes ?? null,
        signed_by_name: data.signedByName ?? null,
        signed_by_relationship: data.signedByRelationship ?? null,
        acknowledged_by: context.user.id,
        recorded_by: context.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return failure(insertError.message, "DB_ERROR");
    }

    const kioskRecord = record as SignInOutRecord;

    // 2. Upsert attendance_records to keep roll-call in sync
    //    Late arrival → status: 'late', check_in_at = occurred_at
    //    Early departure → check_out_at = occurred_at
    //                      update status to 'half_day' if currently present/late
    if (data.type === "late_arrival") {
      const { data: attendanceRow } = await supabase
        .from("attendance_records")
        .upsert(
          {
            tenant_id: context.tenant.id,
            student_id: data.studentId,
            date: data.eventDate,
            status: "late",
            check_in_at: data.occurredAt,
            notes: data.reasonNotes ?? null,
            recorded_by: context.user.id,
            deleted_at: null,
          },
          { onConflict: "tenant_id,student_id,date" },
        )
        .select("id")
        .single();

      // Back-link the attendance record to the kiosk event
      if (attendanceRow) {
        await supabase
          .from("sign_in_out_records")
          .update({
            linked_attendance_id: (attendanceRow as { id: string }).id,
          })
          .eq("id", kioskRecord.id);
      }
    } else {
      // Early departure - find existing record and update check_out_at
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id, status")
        .eq("tenant_id", context.tenant.id)
        .eq("student_id", data.studentId)
        .eq("date", data.eventDate)
        .is("deleted_at", null)
        .single();

      if (existing) {
        const existingRecord = existing as Pick<
          AttendanceRecord,
          "id" | "status"
        >;
        const newStatus =
          existingRecord.status === "present" ||
          existingRecord.status === "late"
            ? "half_day"
            : existingRecord.status;

        await supabase
          .from("attendance_records")
          .update({
            check_out_at: data.occurredAt,
            status: newStatus,
            recorded_by: context.user.id,
          })
          .eq("id", existingRecord.id);

        await supabase
          .from("sign_in_out_records")
          .update({ linked_attendance_id: existingRecord.id })
          .eq("id", kioskRecord.id);
      }
    }

    // 3. Audit
    const auditAction =
      data.type === "late_arrival"
        ? AuditActions.SIGN_IN_OUT_LATE_ARRIVAL
        : AuditActions.SIGN_IN_OUT_EARLY_DEPARTURE;

    await logAudit({
      context,
      action: auditAction,
      entityType: "sign_in_out_record",
      entityId: kioskRecord.id,
      metadata: {
        student_id: data.studentId,
        event_date: data.eventDate,
        occurred_at: data.occurredAt,
        reason_code: data.reasonCode,
        signed_by_name: data.signedByName,
      },
    });

    return success(kioskRecord);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to record sign-in/out";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: Dashboard data for a single date
// ============================================================

export async function getSignInOutDashboard(
  date: string,
): Promise<ActionResponse<SignInOutDashboardData>> {
  try {
    await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sign_in_out_records")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("event_date", date)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>)
      .filter((r) => r.student)
      .map((r) => ({
        ...(r as unknown as SignInOutRecord),
        student: r.student as Pick<
          Student,
          "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
        >,
      })) as SignInOutRecordWithStudent[];

    const lateArrivals = rows.filter((r) => r.type === "late_arrival");
    const earlyDepartures = rows.filter((r) => r.type === "early_departure");

    return success({
      date,
      late_arrivals: lateArrivals,
      early_departures: earlyDepartures,
      total_late: lateArrivals.length,
      total_early: earlyDepartures.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get kiosk dashboard";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LIST: Paginated sign-in/out records with filters
// ============================================================

export async function listSignInOutRecords(
  input: ListSignInOutInput,
): Promise<PaginatedResponse<SignInOutRecordWithStudent>> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;
  try {
    const parsed = ListSignInOutSchema.safeParse(input);
    if (!parsed.success) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: {
          message: parsed.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
      };
    }

    await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();
    const data = parsed.data;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQ = supabase
      .from("sign_in_out_records")
      .select("*", { count: "exact", head: true })
      .gte("event_date", data.startDate)
      .lte("event_date", data.endDate)
      .is("deleted_at", null);

    let dataQ = supabase
      .from("sign_in_out_records")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .gte("event_date", data.startDate)
      .lte("event_date", data.endDate)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .range(from, to);

    if (data.type) {
      countQ = countQ.eq("type", data.type);
      dataQ = dataQ.eq("type", data.type);
    }
    if (data.studentId) {
      countQ = countQ.eq("student_id", data.studentId);
      dataQ = dataQ.eq("student_id", data.studentId);
    }

    const { count, error: countError } = await countQ;
    if (countError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: countError.message, code: "DB_ERROR" },
      };
    }

    const { data: rows, error: dataError } = await dataQ;
    if (dataError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: dataError.message, code: "DB_ERROR" },
      };
    }

    const records = ((rows ?? []) as Array<Record<string, unknown>>)
      .filter((r) => r.student)
      .map((r) => ({
        ...(r as unknown as SignInOutRecord),
        student: r.student as Pick<
          Student,
          "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
        >,
      })) as SignInOutRecordWithStudent[];

    return {
      data: records,
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
      err instanceof Error ? err.message : "Failed to list sign-in/out records";
    return {
      data: [],
      pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
      error: { message, code: "UNEXPECTED_ERROR" },
    };
  }
}

// ============================================================
// SEARCH: Find students by name for kiosk autocomplete
// ============================================================

export async function searchStudentsForKiosk(
  query: string,
): Promise<
  ActionResponse<
    Array<
      Pick<
        Student,
        "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
      >
    >
  >
> {
  try {
    await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    if (!query.trim() || query.trim().length < 2) {
      return success([]);
    }

    const term = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .or(
        `first_name.ilike.${term},last_name.ilike.${term},preferred_name.ilike.${term}`,
      )
      .eq("enrollment_status", "active")
      .is("deleted_at", null)
      .order("last_name", { ascending: true })
      .limit(20);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(
      (data ?? []) as Array<
        Pick<
          Student,
          "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
        >
      >,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search students";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// DELETE: Soft-delete a kiosk record
// ============================================================

export async function deleteSignInOutRecord(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("sign_in_out_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.SIGN_IN_OUT_DELETED,
      entityType: "sign_in_out_record",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete record";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// EXPORT: CSV export for a date range
// ============================================================

export async function exportSignInOutRecords(
  startDate: string,
  endDate: string,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ATTENDANCE);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sign_in_out_records")
      .select("*, student:students(first_name, last_name)")
      .gte("event_date", startDate)
      .lte("event_date", endDate)
      .is("deleted_at", null)
      .order("event_date", { ascending: true })
      .order("occurred_at", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    const header = [
      "Date",
      "Time",
      "Type",
      "Student Last Name",
      "Student First Name",
      "Reason Code",
      "Reason Notes",
      "Signed By",
      "Relationship",
    ].join(",");

    const csvRows = rows.map((r) => {
      const student = r.student as {
        first_name: string;
        last_name: string;
      } | null;
      const time = r.occurred_at
        ? new Date(r.occurred_at as string).toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "";
      const typeLabel =
        r.type === "late_arrival" ? "Late Arrival" : "Early Departure";

      const esc = (val: unknown) =>
        val ? `"${String(val).replace(/"/g, '""')}"` : "";

      return [
        esc(r.event_date),
        esc(time),
        esc(typeLabel),
        esc(student?.last_name),
        esc(student?.first_name),
        esc(r.reason_code),
        esc(r.reason_notes),
        esc(r.signed_by_name),
        esc(r.signed_by_relationship),
      ].join(",");
    });

    const csv = [header, ...csvRows].join("\n");

    await logAudit({
      context,
      action: AuditActions.SIGN_IN_OUT_EXPORTED,
      entityType: "sign_in_out_record",
      entityId: null,
      metadata: {
        start_date: startDate,
        end_date: endDate,
        row_count: rows.length,
      },
    });

    return success(csv);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to export records";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
