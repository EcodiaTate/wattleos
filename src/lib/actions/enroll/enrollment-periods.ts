'use server';

// src/lib/actions/enrollment-periods.ts
//
// ============================================================
// WattleOS V2 - Enrollment Period Server Actions (Module 10)
// ============================================================
// Manages enrollment windows: when schools accept new or
// re-enrollment applications. Admins create periods, configure
// required documents and custom fields, then open them for
// parent submissions.
//
// WHY separate from enrollment-applications.ts: Periods are
// configuration. Applications are transactional. Different
// access patterns and permission requirements.
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  CustomField,
  EnrollmentPeriod,
  EnrollmentPeriodStatus,
} from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateEnrollmentPeriodInput {
  name: string;
  period_type: "new_enrollment" | "re_enrollment" | "mid_year";
  year: number;
  opens_at: string;
  closes_at?: string | null;
  available_programs?: string[];
  required_documents?: string[];
  custom_fields?: CustomField[];
  welcome_message?: string | null;
  confirmation_message?: string | null;
}

export interface UpdateEnrollmentPeriodInput {
  name?: string;
  period_type?: "new_enrollment" | "re_enrollment" | "mid_year";
  year?: number;
  opens_at?: string;
  closes_at?: string | null;
  status?: EnrollmentPeriodStatus;
  available_programs?: string[];
  required_documents?: string[];
  custom_fields?: CustomField[];
  welcome_message?: string | null;
  confirmation_message?: string | null;
}

/** Period with application count stats for the admin list view */
export interface EnrollmentPeriodWithStats extends EnrollmentPeriod {
  total_applications: number;
  submitted_count: number;
  approved_count: number;
  rejected_count: number;
}

// ============================================================
// LIST ENROLLMENT PERIODS
// ============================================================
// Returns all periods for the current tenant, optionally
// filtered by year or status. Includes application counts.

export async function listEnrollmentPeriods(params?: {
  year?: number;
  status?: EnrollmentPeriodStatus;
}): Promise<ActionResponse<EnrollmentPeriodWithStats[]>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("enrollment_periods")
      .select(
        `
        *,
        enrollment_applications(id, status)
      `,
      )
      .is("deleted_at", null)
      .order("year", { ascending: false })
      .order("opens_at", { ascending: false });

    if (params?.year) {
      query = query.eq("year", params.year);
    }
    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Compute stats from nested applications
    const periods: EnrollmentPeriodWithStats[] = (data ?? []).map((row) => {
      const apps = (row.enrollment_applications ?? []) as Array<{
        id: string;
        status: string;
      }>;
      const { enrollment_applications: _, ...period } = row;
      return {
        ...period,
        total_applications: apps.length,
        submitted_count: apps.filter((a) => a.status === "submitted").length,
        approved_count: apps.filter((a) => a.status === "approved").length,
        rejected_count: apps.filter((a) => a.status === "rejected").length,
      } as EnrollmentPeriodWithStats;
    });

    return success(periods);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list enrollment periods";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET ENROLLMENT PERIOD BY ID
// ============================================================

export async function getEnrollmentPeriod(
  periodId: string,
): Promise<ActionResponse<EnrollmentPeriodWithStats>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_periods")
      .select(
        `
        *,
        enrollment_applications(id, status)
      `,
      )
      .eq("id", periodId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.NOT_FOUND);
    }

    const apps = (data.enrollment_applications ?? []) as Array<{
      id: string;
      status: string;
    }>;
    const { enrollment_applications: _, ...period } = data;

    return success({
      ...period,
      total_applications: apps.length,
      submitted_count: apps.filter((a) => a.status === "submitted").length,
      approved_count: apps.filter((a) => a.status === "approved").length,
      rejected_count: apps.filter((a) => a.status === "rejected").length,
    } as EnrollmentPeriodWithStats);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET OPEN PERIODS (PUBLIC - no auth required)
// ============================================================
// Used by the public enrollment form to show which periods
// are currently accepting applications. RLS allows SELECT
// on open periods without authentication.

export async function getOpenEnrollmentPeriods(
  tenantId: string,
): Promise<ActionResponse<EnrollmentPeriod[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_periods")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("opens_at", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Filter to only currently-active periods (opened and not yet closed)
    const now = new Date().toISOString();
    const activePeriods = (data ?? []).filter((p) => {
      if (p.opens_at > now) return false;
      if (p.closes_at && p.closes_at < now) return false;
      return true;
    }) as EnrollmentPeriod[];

    return success(activePeriods);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get open periods";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CREATE ENROLLMENT PERIOD
// ============================================================

export async function createEnrollmentPeriod(
  input: CreateEnrollmentPeriodInput,
): Promise<ActionResponse<EnrollmentPeriod>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Validate required fields
    if (!input.name?.trim()) {
      return failure("Period name is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.opens_at) {
      return failure("Opening date is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (input.year < 2020 || input.year > 2100) {
      return failure(
        "Year must be between 2020 and 2100",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("enrollment_periods")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        period_type: input.period_type,
        year: input.year,
        opens_at: input.opens_at,
        closes_at: input.closes_at ?? null,
        status: "draft",
        available_programs: input.available_programs ?? [],
        required_documents: input.required_documents ?? [],
        custom_fields: input.custom_fields ?? [],
        welcome_message: input.welcome_message ?? null,
        confirmation_message: input.confirmation_message ?? null,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          `An enrollment period named "${input.name}" already exists for ${input.year}`,
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as EnrollmentPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE ENROLLMENT PERIOD
// ============================================================

export async function updateEnrollmentPeriod(
  periodId: string,
  input: UpdateEnrollmentPeriodInput,
): Promise<ActionResponse<EnrollmentPeriod>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    // Build the update payload (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.period_type !== undefined)
      updates.period_type = input.period_type;
    if (input.year !== undefined) updates.year = input.year;
    if (input.opens_at !== undefined) updates.opens_at = input.opens_at;
    if (input.closes_at !== undefined) updates.closes_at = input.closes_at;
    if (input.status !== undefined) updates.status = input.status;
    if (input.available_programs !== undefined)
      updates.available_programs = input.available_programs;
    if (input.required_documents !== undefined)
      updates.required_documents = input.required_documents;
    if (input.custom_fields !== undefined)
      updates.custom_fields = input.custom_fields;
    if (input.welcome_message !== undefined)
      updates.welcome_message = input.welcome_message;
    if (input.confirmation_message !== undefined)
      updates.confirmation_message = input.confirmation_message;

    if (Object.keys(updates).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("enrollment_periods")
      .update(updates)
      .eq("id", periodId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "A period with this name already exists for the given year",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// OPEN ENROLLMENT PERIOD
// ============================================================
// Transitions a period from 'draft' to 'open'. Only drafts can
// be opened. This is the explicit trigger that makes the public
// enrollment form available.

export async function openEnrollmentPeriod(
  periodId: string,
): Promise<ActionResponse<EnrollmentPeriod>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    // Verify current status is draft
    const { data: current, error: fetchError } = await supabase
      .from("enrollment_periods")
      .select("status")
      .eq("id", periodId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Enrollment period not found", ErrorCodes.NOT_FOUND);
    }

    if (current.status !== "draft") {
      return failure(
        `Cannot open a period with status "${current.status}". Only draft periods can be opened.`,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      );
    }

    const { data, error } = await supabase
      .from("enrollment_periods")
      .update({ status: "open" })
      .eq("id", periodId)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to open enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CLOSE ENROLLMENT PERIOD
// ============================================================
// Transitions from 'open' to 'closed'. Stops accepting new
// applications but existing ones can still be reviewed.

export async function closeEnrollmentPeriod(
  periodId: string,
): Promise<ActionResponse<EnrollmentPeriod>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data: current, error: fetchError } = await supabase
      .from("enrollment_periods")
      .select("status")
      .eq("id", periodId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Enrollment period not found", ErrorCodes.NOT_FOUND);
    }

    if (current.status !== "open") {
      return failure(
        `Cannot close a period with status "${current.status}". Only open periods can be closed.`,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      );
    }

    const { data, error } = await supabase
      .from("enrollment_periods")
      .update({ status: "closed" })
      .eq("id", periodId)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentPeriod);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to close enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ARCHIVE ENROLLMENT PERIOD
// ============================================================
// Moves a closed period to 'archived'. Archived periods are
// hidden from the default list but preserved for historical data.

export async function archiveEnrollmentPeriod(
  periodId: string,
): Promise<ActionResponse<EnrollmentPeriod>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data: current, error: fetchError } = await supabase
      .from("enrollment_periods")
      .select("status")
      .eq("id", periodId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Enrollment period not found", ErrorCodes.NOT_FOUND);
    }

    if (current.status !== "closed") {
      return failure(
        `Cannot archive a period with status "${current.status}". Only closed periods can be archived.`,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      );
    }

    const { data, error } = await supabase
      .from("enrollment_periods")
      .update({ status: "archived" })
      .eq("id", periodId)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentPeriod);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to archive enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SOFT DELETE ENROLLMENT PERIOD
// ============================================================
// Only draft periods with zero applications can be deleted.
// Periods with applications should be archived, not deleted.

export async function deleteEnrollmentPeriod(
  periodId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(Permissions.MANAGE_ENROLLMENT_PERIODS);
    const supabase = await createSupabaseServerClient();

    // Check for existing applications
    const { data: current, error: fetchError } = await supabase
      .from("enrollment_periods")
      .select(
        `
        status,
        enrollment_applications(id)
      `,
      )
      .eq("id", periodId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Enrollment period not found", ErrorCodes.NOT_FOUND);
    }

    const appCount =
      (current.enrollment_applications as Array<{ id: string }>)?.length ?? 0;
    if (appCount > 0) {
      return failure(
        `Cannot delete a period with ${appCount} application(s). Archive it instead.`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (current.status !== "draft") {
      return failure(
        "Only draft periods with no applications can be deleted.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { error } = await supabase
      .from("enrollment_periods")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", periodId);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ id: periodId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete enrollment period";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
