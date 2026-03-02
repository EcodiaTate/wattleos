"use server";

// src/lib/actions/reports/report-builder-students.ts
//
// ============================================================
// WattleOS Report Builder - Student Management Actions
// ============================================================
// Manages report_builder_students (lightweight free-tier students).
// No SIS required - just first name, last name, class label.
//
// Free tier limits enforced at this layer (not RLS):
//   - Max 40 students per tenant
//
// Provides:
//   - listReportBuilderStudents
//   - addReportBuilderStudent
//   - updateReportBuilderStudent
//   - deleteReportBuilderStudent
//   - importStudentsFromCsv
//   - getStudentCount
// ============================================================

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  type ActionResponse,
  type PaginatedResponse,
  success,
  failure,
  paginated,
  paginatedFailure,
  ErrorCodes,
} from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface ReportBuilderStudent {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  class_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddStudentInput {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  class_label: string;
}

export interface UpdateStudentInput {
  first_name?: string;
  last_name?: string;
  preferred_name?: string | null;
  class_label?: string;
  is_active?: boolean;
}

export interface CsvStudentRow {
  first_name: string;
  last_name: string;
  preferred_name?: string;
  class_label: string;
}

const FREE_TIER_STUDENT_LIMIT = 40;

// ============================================================
// LIST
// ============================================================

export async function listReportBuilderStudents(params?: {
  class_label?: string;
  active_only?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ReportBuilderStudent>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 100;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("report_builder_students")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("class_label", { ascending: true })
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params?.active_only !== false) {
      query = query.eq("is_active", true);
    }
    if (params?.class_label) {
      query = query.eq("class_label", params.class_label);
    }

    const { data, count, error } = await query;
    if (error) return paginatedFailure(error.message);

    return paginated(data ?? [], count ?? 0, page, perPage);
  } catch {
    return paginatedFailure("Failed to list students.");
  }
}

// ============================================================
// GET COUNT
// ============================================================

export async function getStudentCount(): Promise<ActionResponse<number>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from("report_builder_students")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) return failure(error.message);
    return success(count ?? 0);
  } catch {
    return failure("Failed to get student count.");
  }
}

// ============================================================
// GET UNIQUE CLASS LABELS
// ============================================================

export async function listClassLabels(): Promise<ActionResponse<string[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_builder_students")
      .select("class_label")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) return failure(error.message);

    const labels = [...new Set((data ?? []).map((r) => r.class_label))].sort();
    return success(labels);
  } catch {
    return failure("Failed to list classes.");
  }
}

// ============================================================
// ADD STUDENT
// ============================================================

export async function addReportBuilderStudent(
  input: AddStudentInput,
): Promise<ActionResponse<ReportBuilderStudent>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);

    if (!input.first_name?.trim()) {
      return failure("First name is required.", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.last_name?.trim()) {
      return failure("Last name is required.", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.class_label?.trim()) {
      return failure("Class is required.", ErrorCodes.VALIDATION_ERROR);
    }

    const supabase = await createSupabaseServerClient();

    // ── Free tier student limit ───────────────────────────────
    const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
    if (planTier === "free") {
      const { count } = await supabase
        .from("report_builder_students")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", context.tenant.id)
        .eq("is_active", true)
        .is("deleted_at", null);

      if ((count ?? 0) >= FREE_TIER_STUDENT_LIMIT) {
        return failure(
          `Free plan supports up to ${FREE_TIER_STUDENT_LIMIT} students. Upgrade to Pro for unlimited students.`,
          ErrorCodes.RATE_LIMITED,
        );
      }
    }

    const { data, error } = await supabase
      .from("report_builder_students")
      .insert({
        tenant_id: context.tenant.id,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        preferred_name: input.preferred_name?.trim() || null,
        class_label: input.class_label.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) return failure(error.message);
    return success(data as ReportBuilderStudent);
  } catch {
    return failure("Failed to add student.");
  }
}

// ============================================================
// UPDATE STUDENT
// ============================================================

export async function updateReportBuilderStudent(
  studentId: string,
  input: UpdateStudentInput,
): Promise<ActionResponse<ReportBuilderStudent>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_builder_students")
      .update({
        ...(input.first_name !== undefined && {
          first_name: input.first_name.trim(),
        }),
        ...(input.last_name !== undefined && {
          last_name: input.last_name.trim(),
        }),
        ...(input.preferred_name !== undefined && {
          preferred_name: input.preferred_name?.trim() || null,
        }),
        ...(input.class_label !== undefined && {
          class_label: input.class_label.trim(),
        }),
        ...(input.is_active !== undefined && { is_active: input.is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);
    return success(data as ReportBuilderStudent);
  } catch {
    return failure("Failed to update student.");
  }
}

// ============================================================
// DELETE STUDENT (soft)
// ============================================================

export async function deleteReportBuilderStudent(
  studentId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("report_builder_students")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", studentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message);
    return success(undefined);
  } catch {
    return failure("Failed to delete student.");
  }
}

// ============================================================
// IMPORT FROM CSV
// ============================================================
// Bulk import students from a parsed CSV array.
// Skips duplicates (same first+last name in same class).
// Respects free tier limit - imports up to the limit, returns
// how many were skipped for being over limit.

export async function importStudentsFromCsv(
  rows: CsvStudentRow[],
): Promise<
  ActionResponse<{
    imported: number;
    skipped_duplicate: number;
    skipped_limit: number;
  }>
> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const admin = await createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    if (!rows.length) {
      return failure("No rows to import.", ErrorCodes.VALIDATION_ERROR);
    }

    const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
    const limit = planTier === "free" ? FREE_TIER_STUDENT_LIMIT : Infinity;

    // Current count
    const { count: current } = await supabase
      .from("report_builder_students")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    const currentCount = current ?? 0;
    const remaining = limit - currentCount;

    // Fetch existing names to skip duplicates
    const { data: existing } = await supabase
      .from("report_builder_students")
      .select("first_name, last_name, class_label")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    const existingSet = new Set(
      (existing ?? []).map(
        (e) =>
          `${e.first_name.toLowerCase()}||${e.last_name.toLowerCase()}||${e.class_label.toLowerCase()}`,
      ),
    );

    const validRows = rows
      .filter(
        (r) =>
          r.first_name?.trim() && r.last_name?.trim() && r.class_label?.trim(),
      )
      .filter(
        (r) =>
          !existingSet.has(
            `${r.first_name.trim().toLowerCase()}||${r.last_name.trim().toLowerCase()}||${r.class_label.trim().toLowerCase()}`,
          ),
      );

    const duplicateCount = rows.length - validRows.length;
    const toInsert = validRows.slice(0, remaining);
    const limitCount = validRows.length - toInsert.length;

    if (!toInsert.length) {
      return success({
        imported: 0,
        skipped_duplicate: duplicateCount,
        skipped_limit: limitCount,
      });
    }

    const insertRows = toInsert.map((r) => ({
      tenant_id: context.tenant.id,
      first_name: r.first_name.trim(),
      last_name: r.last_name.trim(),
      preferred_name: r.preferred_name?.trim() || null,
      class_label: r.class_label.trim(),
      is_active: true,
    }));

    const { data: inserted, error } = await admin
      .from("report_builder_students")
      .insert(insertRows)
      .select("id");

    if (error) return failure(error.message);

    return success({
      imported: inserted?.length ?? 0,
      skipped_duplicate: duplicateCount,
      skipped_limit: limitCount,
    });
  } catch {
    return failure("Failed to import students.");
  }
}
