'use server';

// src/lib/actions/pay-periods.ts
//
// ============================================================
// WattleOS V2 - Pay Period Server Actions
// ============================================================
// Manages pay cycle records (weekly/fortnightly/monthly).
// Pay periods are explicit DB records rather than computed dates
// because they handle edge cases (holidays, mid-cycle starts).
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { PayFrequency, PayPeriod } from "@/types/domain";

// ============================================================
// GET: Current open pay period (for today's date)
// ============================================================

/**
 * Returns the currently open pay period that contains today's date.
 * Any authenticated user can call this (staff need it for time logging).
 */
export async function getCurrentPayPeriod(): Promise<
  ActionResponse<PayPeriod | null>
> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("pay_periods")
      .select("*")
      .eq("status", "open")
      .lte("start_date", today)
      .gte("end_date", today)
      .is("deleted_at", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success((data as PayPeriod) ?? null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get current pay period";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LIST: All pay periods (paginated)
// ============================================================

export async function listPayPeriods(params?: {
  status?: string;
  page?: number;
  perPage?: number;
}): Promise<ActionResponse<{ periods: PayPeriod[]; total: number }>> {
  try {
    await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("pay_periods")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("start_date", { ascending: false })
      .range(from, to);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error, count } = await query;

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({
      periods: (data ?? []) as PayPeriod[],
      total: count ?? 0,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list pay periods";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// CREATE: New pay period
// ============================================================

export async function createPayPeriod(input: {
  name: string;
  startDate: string;
  endDate: string;
  frequency: PayFrequency;
}): Promise<ActionResponse<PayPeriod>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // Validate dates
    if (new Date(input.startDate) >= new Date(input.endDate)) {
      return failure("Start date must be before end date", "VALIDATION_ERROR");
    }

    // Check for overlapping periods
    const { data: overlap } = await supabase
      .from("pay_periods")
      .select("id")
      .is("deleted_at", null)
      .or(
        `and(start_date.lte.${input.endDate},end_date.gte.${input.startDate})`,
      )
      .limit(1);

    if (overlap && overlap.length > 0) {
      return failure(
        "This period overlaps with an existing pay period",
        "VALIDATION_ERROR",
      );
    }

    const { data, error } = await supabase
      .from("pay_periods")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        frequency: input.frequency,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as PayPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create pay period";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LOCK: Prevent further time entry edits for this period
// ============================================================

export async function lockPayPeriod(
  payPeriodId: string,
): Promise<ActionResponse<PayPeriod>> {
  try {
    const context = await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchError } = await supabase
      .from("pay_periods")
      .select("*")
      .eq("id", payPeriodId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Pay period not found", "NOT_FOUND");
    }

    const period = existing as PayPeriod;

    if (period.status !== "open") {
      return failure(
        `Cannot lock a period that is already '${period.status}'`,
        "VALIDATION_ERROR",
      );
    }

    const { data, error } = await supabase
      .from("pay_periods")
      .update({
        status: "locked",
        locked_at: new Date().toISOString(),
        locked_by: context.user.id,
      })
      .eq("id", payPeriodId)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as PayPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to lock pay period";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// MARK PROCESSED: After all timesheets synced to payroll
// ============================================================

export async function markPayPeriodProcessed(
  payPeriodId: string,
): Promise<ActionResponse<PayPeriod>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pay_periods")
      .update({ status: "processed" })
      .eq("id", payPeriodId)
      .eq("status", "locked")
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (!data) {
      return failure(
        "Pay period not found or not in locked status",
        "VALIDATION_ERROR",
      );
    }

    return success(data as PayPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark period as processed";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
