'use server';

// src/lib/actions/time-entries.ts
//
// ============================================================
// WattleOS V2 - Time Entry Server Actions
// ============================================================
// Manages daily time records for staff. One entry per person
// per day (Australian award structure).
//
// WHY separate from timesheets.ts: Time entries are the daily
// input workflow (guide logs hours). Timesheets are the
// aggregated output (submitted for approval).
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { TimeEntry, TimeEntryType } from "@/types/domain";

// ============================================================
// Types
// ============================================================

interface LogTimeEntryInput {
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  entryType?: TimeEntryType;
  classId?: string;
  notes?: string;
}

export interface TimeEntryWithMeta extends TimeEntry {
  class_name?: string | null;
}

// ============================================================
// LOG: Create or update a daily time entry (upsert)
// ============================================================

/**
 * Creates or updates a time entry for the current user on a given date.
 * Uses upsert on the (tenant_id, user_id, date) unique constraint.
 *
 * Validation:
 * - end_time must be after start_time
 * - break_minutes must be non-negative
 * - Cannot edit entries in a locked or processed pay period
 */
export async function logTimeEntry(
  input: LogTimeEntryInput,
): Promise<ActionResponse<TimeEntry>> {
  try {
    const context = await requirePermission(Permissions.LOG_TIME);
    const supabase = await createSupabaseServerClient();

    // Validate times
    if (input.startTime >= input.endTime) {
      return failure("End time must be after start time", "VALIDATION_ERROR");
    }

    const breakMinutes = input.breakMinutes ?? 30;
    if (breakMinutes < 0) {
      return failure("Break minutes cannot be negative", "VALIDATION_ERROR");
    }

    // Check if the date falls in a locked/processed period
    const { data: lockedPeriod } = await supabase
      .from("pay_periods")
      .select("id, status")
      .lte("start_date", input.date)
      .gte("end_date", input.date)
      .in("status", ["locked", "processed"])
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (lockedPeriod) {
      return failure(
        "Cannot edit time entries for a locked or processed pay period",
        "VALIDATION_ERROR",
      );
    }

    // Find the open pay period for this date (to link the entry)
    const { data: openPeriod } = await supabase
      .from("pay_periods")
      .select("id")
      .lte("start_date", input.date)
      .gte("end_date", input.date)
      .eq("status", "open")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    // Check if entry already exists (for upsert)
    const { data: existing } = await supabase
      .from("time_entries")
      .select("id")
      .eq("user_id", context.user.id)
      .eq("date", input.date)
      .is("deleted_at", null)
      .maybeSingle();

    const entryData = {
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      pay_period_id: (openPeriod as { id: string } | null)?.id ?? null,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      break_minutes: breakMinutes,
      entry_type: input.entryType ?? "regular",
      class_id: input.classId ?? null,
      notes: input.notes ?? null,
    };

    let data: unknown;
    let error: { message: string } | null;

    if (existing) {
      // Update existing entry
      const result = await supabase
        .from("time_entries")
        .update({
          start_time: entryData.start_time,
          end_time: entryData.end_time,
          break_minutes: entryData.break_minutes,
          entry_type: entryData.entry_type,
          class_id: entryData.class_id,
          notes: entryData.notes,
          pay_period_id: entryData.pay_period_id,
        })
        .eq("id", (existing as { id: string }).id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new entry
      const result = await supabase
        .from("time_entries")
        .insert(entryData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as TimeEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to log time entry";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: My time entries for a pay period or date range
// ============================================================

export async function getMyTimeEntries(params?: {
  payPeriodId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActionResponse<TimeEntryWithMeta[]>> {
  try {
    const context = await requirePermission(Permissions.LOG_TIME);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("time_entries")
      .select(
        `
        *,
        class:classes(name)
      `,
      )
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .order("date", { ascending: true });

    if (params?.payPeriodId) {
      query = query.eq("pay_period_id", params.payPeriodId);
    }

    if (params?.startDate) {
      query = query.gte("date", params.startDate);
    }

    if (params?.endDate) {
      query = query.lte("date", params.endDate);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    // Flatten the class join
    const entries: TimeEntryWithMeta[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const classData = row.class as { name: string } | null;
      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        user_id: row.user_id as string,
        pay_period_id: row.pay_period_id as string | null,
        date: row.date as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        break_minutes: row.break_minutes as number,
        total_hours: row.total_hours as number,
        entry_type: row.entry_type as TimeEntryType,
        class_id: row.class_id as string | null,
        notes: row.notes as string | null,
        class_name: classData?.name ?? null,
      };
    });

    return success(entries);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get time entries";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: All time entries for a user in a pay period (approver)
// ============================================================

export async function getTimeEntriesForUser(params: {
  userId: string;
  payPeriodId: string;
}): Promise<ActionResponse<TimeEntryWithMeta[]>> {
  try {
    await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("time_entries")
      .select(
        `
        *,
        class:classes(name)
      `,
      )
      .eq("user_id", params.userId)
      .eq("pay_period_id", params.payPeriodId)
      .is("deleted_at", null)
      .order("date", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    const entries: TimeEntryWithMeta[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const classData = row.class as { name: string } | null;
      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        user_id: row.user_id as string,
        pay_period_id: row.pay_period_id as string | null,
        date: row.date as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        break_minutes: row.break_minutes as number,
        total_hours: row.total_hours as number,
        entry_type: row.entry_type as TimeEntryType,
        class_id: row.class_id as string | null,
        notes: row.notes as string | null,
        class_name: classData?.name ?? null,
      };
    });

    return success(entries);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get time entries";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// DELETE: Soft-delete a time entry (own entries only)
// ============================================================

export async function deleteTimeEntry(
  entryId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(Permissions.LOG_TIME);
    const supabase = await createSupabaseServerClient();

    // Verify ownership and that it's not in a locked period
    const { data: entry, error: fetchError } = await supabase
      .from("time_entries")
      .select("id, user_id, pay_period_id")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !entry) {
      return failure("Time entry not found", "NOT_FOUND");
    }

    const typedEntry = entry as {
      id: string;
      user_id: string;
      pay_period_id: string | null;
    };

    if (typedEntry.user_id !== context.user.id) {
      return failure("You can only delete your own time entries", "FORBIDDEN");
    }

    // Check if linked to a locked period
    if (typedEntry.pay_period_id) {
      const { data: period } = await supabase
        .from("pay_periods")
        .select("status")
        .eq("id", typedEntry.pay_period_id)
        .single();

      if (period && (period as { status: string }).status !== "open") {
        return failure(
          "Cannot delete entries in a locked or processed pay period",
          "VALIDATION_ERROR",
        );
      }
    }

    const { error } = await supabase
      .from("time_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete time entry";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
