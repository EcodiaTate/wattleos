"use server";

// src/lib/actions/naplan.ts
//
// ============================================================
// NAPLAN Coordination - Server Actions
// ============================================================
// Manages NAPLAN test windows, student cohorts, opt-outs, and
// post-test result entry.
//
// Permissions:
//   VIEW_NAPLAN   - read windows, cohort, results, export
//   MANAGE_NAPLAN - create/update windows, generate cohorts,
//                   record opt-outs, enter results
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import {
  NAPLAN_DOMAINS,
  NAPLAN_TOTAL_DOMAINS,
  NAPLAN_YEAR_LEVELS,
} from "@/lib/constants/naplan";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  type AddCohortEntryInput,
  AddCohortEntrySchema,
  type BatchRecordResultsInput,
  BatchRecordResultsSchema,
  type CreateTestWindowInput,
  CreateTestWindowSchema,
  type GenerateCohortInput,
  GenerateCohortSchema,
  type ListCohortInput,
  ListCohortSchema,
  type RecordDomainResultInput,
  RecordDomainResultSchema,
  type RecordOptOutInput,
  RecordOptOutSchema,
  type RemoveOptOutInput,
  RemoveOptOutSchema,
  type SetWindowStatusInput,
  SetWindowStatusSchema,
  type UpdateTestWindowInput,
  UpdateTestWindowSchema,
} from "@/lib/validations/naplan";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  NaplanCohortEntryWithStudent,
  NaplanDashboardData,
  NaplanDomainResult,
  NaplanStudentRecord,
  NaplanTestWindow,
  NaplanTestWindowWithCounts,
  NaplanWindowSummary,
  NaplanYearLevel,
} from "@/types/domain";

// ============================================================
// Helpers
// ============================================================

function buildWindowWithCounts(
  window: NaplanTestWindow,
  entries: { is_opted_out: boolean; results_count: number }[],
): NaplanTestWindowWithCounts {
  const cohort_count = entries.length;
  const opted_out_count = entries.filter((e) => e.is_opted_out).length;
  const active_entries = entries.filter((e) => !e.is_opted_out);
  const results_entered_count = active_entries.reduce(
    (sum, e) => sum + e.results_count,
    0,
  );
  const results_total_possible = active_entries.length * NAPLAN_TOTAL_DOMAINS;

  return {
    ...window,
    cohort_count,
    opted_out_count,
    results_entered_count,
    results_total_possible,
  };
}

// ============================================================
// Dashboard
// ============================================================

export async function getNaplanDashboard(): Promise<
  ActionResponse<NaplanDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const { data: windows, error: windowsErr } = await supabase
      .from("naplan_test_windows")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("collection_year", { ascending: false });

    if (windowsErr)
      return failure(windowsErr.message, ErrorCodes.DATABASE_ERROR);

    // For each window, get cohort entry counts
    const windowsWithCounts: NaplanTestWindowWithCounts[] = await Promise.all(
      (windows ?? []).map(async (w) => {
        const { data: entries } = await supabase
          .from("naplan_cohort_entries")
          .select("is_opted_out, naplan_domain_results(id)")
          .eq("window_id", w.id);

        const mapped = (entries ?? []).map((e) => ({
          is_opted_out: e.is_opted_out,
          results_count: Array.isArray(e.naplan_domain_results)
            ? e.naplan_domain_results.length
            : 0,
        }));
        return buildWindowWithCounts(w as NaplanTestWindow, mapped);
      }),
    );

    const currentYear = new Date().getFullYear();
    const thisYearWindow = windowsWithCounts.find(
      (w) => w.collection_year === currentYear,
    );
    const active_window =
      windowsWithCounts.find((w) => w.status === "active") ?? null;

    const total_students_this_year = thisYearWindow?.cohort_count ?? 0;
    const total_opted_out_this_year = thisYearWindow?.opted_out_count ?? 0;
    const results_completion_pct =
      thisYearWindow && thisYearWindow.results_total_possible > 0
        ? Math.round(
            (thisYearWindow.results_entered_count /
              thisYearWindow.results_total_possible) *
              100,
          )
        : 0;

    return success({
      windows: windowsWithCounts,
      active_window,
      total_students_this_year,
      total_opted_out_this_year,
      results_completion_pct,
    });
  } catch (error) {
    console.error("[naplan] getNaplanDashboard error:", error);
    return failure(
      "Failed to load NAPLAN dashboard",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

// ============================================================
// Test window CRUD
// ============================================================

export async function createTestWindow(
  input: CreateTestWindowInput,
): Promise<ActionResponse<NaplanTestWindow>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = CreateTestWindowSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("naplan_test_windows")
      .insert({
        tenant_id: context.tenant.id,
        collection_year: v.collection_year,
        status: "draft",
        test_start_date: v.test_start_date || null,
        test_end_date: v.test_end_date || null,
        notes: v.notes || null,
        created_by: context.user.id,
        updated_by: context.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          `A NAPLAN window for ${v.collection_year} already exists`,
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.NAPLAN_WINDOW_CREATED,
      entityType: "naplan_test_window",
      entityId: data.id,
      metadata: { collection_year: v.collection_year },
    });

    return success(data as NaplanTestWindow);
  } catch (error) {
    console.error("[naplan] createTestWindow error:", error);
    return failure("Failed to create NAPLAN window", ErrorCodes.DATABASE_ERROR);
  }
}

export async function updateTestWindow(
  input: UpdateTestWindowInput,
): Promise<ActionResponse<NaplanTestWindow>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = UpdateTestWindowSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { id, ...updates } = parsed.data;

    const { data, error } = await supabase
      .from("naplan_test_windows")
      .update({
        ...updates,
        test_start_date: updates.test_start_date || null,
        test_end_date: updates.test_end_date || null,
        notes: updates.notes || null,
        updated_by: context.user.id,
      })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Window not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_WINDOW_UPDATED,
      entityType: "naplan_test_window",
      entityId: id,
    });

    return success(data as NaplanTestWindow);
  } catch (error) {
    console.error("[naplan] updateTestWindow error:", error);
    return failure("Failed to update NAPLAN window", ErrorCodes.DATABASE_ERROR);
  }
}

export async function setWindowStatus(
  input: SetWindowStatusInput,
): Promise<ActionResponse<NaplanTestWindow>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = SetWindowStatusSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { id, status } = parsed.data;

    const { data, error } = await supabase
      .from("naplan_test_windows")
      .update({ status, updated_by: context.user.id })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Window not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_WINDOW_STATUS_SET,
      entityType: "naplan_test_window",
      entityId: id,
      metadata: { status },
    });

    return success(data as NaplanTestWindow);
  } catch (error) {
    console.error("[naplan] setWindowStatus error:", error);
    return failure("Failed to update window status", ErrorCodes.DATABASE_ERROR);
  }
}

export async function deleteTestWindow(
  windowId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    // Only allow deletion of draft windows
    const { data: existing } = await supabase
      .from("naplan_test_windows")
      .select("status, collection_year")
      .eq("id", windowId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) return failure("Window not found", ErrorCodes.NOT_FOUND);
    if (existing.status !== "draft") {
      return failure(
        "Only draft windows can be deleted",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { error } = await supabase
      .from("naplan_test_windows")
      .delete()
      .eq("id", windowId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_WINDOW_DELETED,
      entityType: "naplan_test_window",
      entityId: windowId,
      metadata: { collection_year: existing.collection_year },
    });

    return success(null);
  } catch (error) {
    console.error("[naplan] deleteTestWindow error:", error);
    return failure("Failed to delete NAPLAN window", ErrorCodes.DATABASE_ERROR);
  }
}

export async function getTestWindow(
  windowId: string,
): Promise<ActionResponse<NaplanTestWindowWithCounts>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const { data: window, error } = await supabase
      .from("naplan_test_windows")
      .select("*")
      .eq("id", windowId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error || !window)
      return failure("Window not found", ErrorCodes.NOT_FOUND);

    const { data: entries } = await supabase
      .from("naplan_cohort_entries")
      .select("is_opted_out, naplan_domain_results(id)")
      .eq("window_id", windowId);

    const mapped = (entries ?? []).map((e) => ({
      is_opted_out: e.is_opted_out,
      results_count: Array.isArray(e.naplan_domain_results)
        ? e.naplan_domain_results.length
        : 0,
    }));

    return success(buildWindowWithCounts(window as NaplanTestWindow, mapped));
  } catch (error) {
    console.error("[naplan] getTestWindow error:", error);
    return failure("Failed to load NAPLAN window", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// Cohort management
// ============================================================

export async function generateCohort(
  input: GenerateCohortInput,
): Promise<ActionResponse<{ inserted: number; skipped: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = GenerateCohortSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { window_id } = parsed.data;

    // Verify window belongs to tenant
    const { data: window } = await supabase
      .from("naplan_test_windows")
      .select("id, status")
      .eq("id", window_id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!window) return failure("Window not found", ErrorCodes.NOT_FOUND);
    if (window.status === "closed") {
      return failure(
        "Cannot modify cohort on a closed window",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Find active enrollments where year_level is a NAPLAN year
    const { data: enrollments, error: enrollErr } = await supabase
      .from("enrollments")
      .select("student_id, students!inner(id, year_level)")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active")
      .in("students.year_level", NAPLAN_YEAR_LEVELS as number[]);

    if (enrollErr) return failure(enrollErr.message, ErrorCodes.DATABASE_ERROR);

    if (!enrollments || enrollments.length === 0) {
      return success({ inserted: 0, skipped: 0 });
    }

    // Existing entries (to avoid duplicates)
    const { data: existing } = await supabase
      .from("naplan_cohort_entries")
      .select("student_id")
      .eq("window_id", window_id);

    const existingIds = new Set((existing ?? []).map((e) => e.student_id));

    const toInsert = enrollments
      .filter((e) => {
        const student = Array.isArray(e.students) ? e.students[0] : e.students;
        return (
          student &&
          !existingIds.has(e.student_id) &&
          NAPLAN_YEAR_LEVELS.includes(student.year_level as NaplanYearLevel)
        );
      })
      .map((e) => {
        const student = Array.isArray(e.students) ? e.students[0] : e.students;
        return {
          tenant_id: context.tenant.id,
          window_id,
          student_id: e.student_id,
          year_level: student.year_level as NaplanYearLevel,
          is_opted_out: false,
          created_by: context.user.id,
          updated_by: context.user.id,
        };
      });

    const skipped = enrollments.length - toInsert.length;

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("naplan_cohort_entries")
        .insert(toInsert);

      if (insertErr)
        return failure(insertErr.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.NAPLAN_COHORT_GENERATED,
      entityType: "naplan_test_window",
      entityId: window_id,
      metadata: { inserted: toInsert.length, skipped },
    });

    return success({ inserted: toInsert.length, skipped });
  } catch (error) {
    console.error("[naplan] generateCohort error:", error);
    return failure(
      "Failed to generate NAPLAN cohort",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

export async function addCohortEntry(
  input: AddCohortEntryInput,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = AddCohortEntrySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { error } = await supabase.from("naplan_cohort_entries").insert({
      tenant_id: context.tenant.id,
      window_id: v.window_id,
      student_id: v.student_id,
      year_level: v.year_level,
      notes: v.notes || null,
      created_by: context.user.id,
      updated_by: context.user.id,
    });

    if (error) {
      if (error.code === "23505") {
        return failure(
          "Student is already in this cohort",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.NAPLAN_COHORT_ENTRY_ADDED,
      entityType: "naplan_cohort_entry",
      entityId: v.student_id,
      metadata: { window_id: v.window_id },
    });

    return success(null);
  } catch (error) {
    console.error("[naplan] addCohortEntry error:", error);
    return failure(
      "Failed to add student to cohort",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

export async function removeCohortEntry(
  entryId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const { data: entry } = await supabase
      .from("naplan_cohort_entries")
      .select("id, student_id, window_id")
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!entry) return failure("Cohort entry not found", ErrorCodes.NOT_FOUND);

    const { error } = await supabase
      .from("naplan_cohort_entries")
      .delete()
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_COHORT_ENTRY_REMOVED,
      entityType: "naplan_cohort_entry",
      entityId: entryId,
      metadata: { student_id: entry.student_id, window_id: entry.window_id },
    });

    return success(null);
  } catch (error) {
    console.error("[naplan] removeCohortEntry error:", error);
    return failure(
      "Failed to remove student from cohort",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

export async function getWindowCohort(
  input: ListCohortInput,
): Promise<ActionResponse<NaplanCohortEntryWithStudent[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = ListCohortSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    let query = supabase
      .from("naplan_cohort_entries")
      .select(
        `
        *,
        students!inner(id, first_name, last_name, year_level, photo_url),
        naplan_domain_results(*)
      `,
      )
      .eq("window_id", v.window_id)
      .eq("tenant_id", context.tenant.id);

    if (v.year_level !== undefined) {
      query = query.eq("year_level", v.year_level);
    }
    if (v.opted_out_only) {
      query = query.eq("is_opted_out", true);
    }

    const { data, error } = await query.order("year_level").order("created_at");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    let entries = (data ?? []).map((row) => {
      const student = Array.isArray(row.students)
        ? row.students[0]
        : row.students;
      const results = (row.naplan_domain_results ?? []) as NaplanDomainResult[];
      return {
        ...row,
        student,
        results,
        results_count: results.length,
      } as NaplanCohortEntryWithStudent;
    });

    // Filter: results pending (opted-in students without complete results)
    if (v.results_pending_only) {
      entries = entries.filter(
        (e) => !e.is_opted_out && e.results_count < NAPLAN_TOTAL_DOMAINS,
      );
    }

    // Filter: name search
    if (v.search) {
      const q = v.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.student.first_name.toLowerCase().includes(q) ||
          e.student.last_name.toLowerCase().includes(q),
      );
    }

    return success(entries);
  } catch (error) {
    console.error("[naplan] getWindowCohort error:", error);
    return failure("Failed to load cohort", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// Opt-outs
// ============================================================

export async function recordOptOut(
  input: RecordOptOutInput,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = RecordOptOutSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { cohort_entry_id, opt_out_reason } = parsed.data;

    const { error } = await supabase
      .from("naplan_cohort_entries")
      .update({
        is_opted_out: true,
        opt_out_reason: opt_out_reason || null,
        opt_out_recorded_by: context.user.id,
        opt_out_at: new Date().toISOString(),
        updated_by: context.user.id,
      })
      .eq("id", cohort_entry_id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_OPT_OUT_RECORDED,
      entityType: "naplan_cohort_entry",
      entityId: cohort_entry_id,
      metadata: { reason: opt_out_reason },
    });

    return success(null);
  } catch (error) {
    console.error("[naplan] recordOptOut error:", error);
    return failure("Failed to record opt-out", ErrorCodes.DATABASE_ERROR);
  }
}

export async function removeOptOut(
  input: RemoveOptOutInput,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = RemoveOptOutSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { cohort_entry_id } = parsed.data;

    const { error } = await supabase
      .from("naplan_cohort_entries")
      .update({
        is_opted_out: false,
        opt_out_reason: null,
        opt_out_recorded_by: null,
        opt_out_at: null,
        updated_by: context.user.id,
      })
      .eq("id", cohort_entry_id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_OPT_OUT_REMOVED,
      entityType: "naplan_cohort_entry",
      entityId: cohort_entry_id,
    });

    return success(null);
  } catch (error) {
    console.error("[naplan] removeOptOut error:", error);
    return failure("Failed to remove opt-out", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// Domain results
// ============================================================

export async function recordDomainResult(
  input: RecordDomainResultInput,
): Promise<ActionResponse<NaplanDomainResult>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = RecordDomainResultSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify the cohort entry belongs to this tenant
    const { data: entry } = await supabase
      .from("naplan_cohort_entries")
      .select("id, window_id, is_opted_out")
      .eq("id", v.cohort_entry_id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!entry) return failure("Cohort entry not found", ErrorCodes.NOT_FOUND);
    if (entry.is_opted_out) {
      return failure(
        "Cannot enter results for an opted-out student",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Upsert - if a result already exists for this domain, update it
    const { data, error } = await supabase
      .from("naplan_domain_results")
      .upsert(
        {
          tenant_id: context.tenant.id,
          cohort_entry_id: v.cohort_entry_id,
          domain: v.domain,
          proficiency_level: v.proficiency_level,
          scaled_score: v.scaled_score ?? null,
          national_average_score: v.national_average_score ?? null,
          state_average_score: v.state_average_score ?? null,
          above_national_minimum: v.above_national_minimum ?? true,
          notes: v.notes || null,
          created_by: context.user.id,
          updated_by: context.user.id,
        },
        { onConflict: "cohort_entry_id,domain" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_RESULT_RECORDED,
      entityType: "naplan_domain_result",
      entityId: data.id,
      metadata: {
        cohort_entry_id: v.cohort_entry_id,
        domain: v.domain,
        proficiency_level: v.proficiency_level,
      },
    });

    return success(data as NaplanDomainResult);
  } catch (error) {
    console.error("[naplan] recordDomainResult error:", error);
    return failure("Failed to record result", ErrorCodes.DATABASE_ERROR);
  }
}

export async function batchRecordResults(
  input: BatchRecordResultsInput,
): Promise<ActionResponse<{ saved: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const parsed = BatchRecordResultsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { cohort_entry_id, results } = parsed.data;

    // Verify cohort entry
    const { data: entry } = await supabase
      .from("naplan_cohort_entries")
      .select("id, is_opted_out")
      .eq("id", cohort_entry_id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!entry) return failure("Cohort entry not found", ErrorCodes.NOT_FOUND);
    if (entry.is_opted_out) {
      return failure(
        "Cannot enter results for an opted-out student",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const rows = results.map((r) => ({
      tenant_id: context.tenant.id,
      cohort_entry_id,
      domain: r.domain,
      proficiency_level: r.proficiency_level,
      scaled_score: r.scaled_score ?? null,
      national_average_score: r.national_average_score ?? null,
      state_average_score: r.state_average_score ?? null,
      above_national_minimum: r.above_national_minimum ?? true,
      notes: r.notes || null,
      created_by: context.user.id,
      updated_by: context.user.id,
    }));

    const { error } = await supabase
      .from("naplan_domain_results")
      .upsert(rows, { onConflict: "cohort_entry_id,domain" });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.NAPLAN_RESULT_RECORDED,
      entityType: "naplan_cohort_entry",
      entityId: cohort_entry_id,
      metadata: { domains_saved: results.map((r) => r.domain) },
    });

    return success({ saved: results.length });
  } catch (error) {
    console.error("[naplan] batchRecordResults error:", error);
    return failure("Failed to save results", ErrorCodes.DATABASE_ERROR);
  }
}

export async function getStudentRecord(
  entryId: string,
): Promise<ActionResponse<NaplanStudentRecord>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const { data: entry, error } = await supabase
      .from("naplan_cohort_entries")
      .select(
        `
        *,
        students!inner(id, first_name, last_name, year_level, photo_url),
        naplan_domain_results(*)
      `,
      )
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error || !entry) {
      return failure("Student record not found", ErrorCodes.NOT_FOUND);
    }

    const student = Array.isArray(entry.students)
      ? entry.students[0]
      : entry.students;
    const results = (entry.naplan_domain_results ?? []) as NaplanDomainResult[];

    const results_by_domain = results.reduce(
      (acc, r) => {
        acc[r.domain] = r;
        return acc;
      },
      {} as Partial<Record<string, NaplanDomainResult>>,
    );

    const below_nms_domains = results
      .filter((r) => !r.above_national_minimum)
      .map((r) => r.domain);

    return success({
      cohort_entry: {
        ...entry,
        student,
        results,
        results_count: results.length,
      } as NaplanCohortEntryWithStudent,
      results_by_domain,
      completion_count: results.length,
      below_nms_domains,
    } as NaplanStudentRecord);
  } catch (error) {
    console.error("[naplan] getStudentRecord error:", error);
    return failure("Failed to load student record", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// Window summary (for detail page)
// ============================================================

export async function getWindowSummary(
  windowId: string,
): Promise<ActionResponse<NaplanWindowSummary>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const { data: window } = await supabase
      .from("naplan_test_windows")
      .select("*")
      .eq("id", windowId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!window) return failure("Window not found", ErrorCodes.NOT_FOUND);

    const { data: entries } = await supabase
      .from("naplan_cohort_entries")
      .select(
        "year_level, is_opted_out, naplan_domain_results(above_national_minimum)",
      )
      .eq("window_id", windowId);

    const allEntries = entries ?? [];
    const entryMapped = allEntries.map((e) => ({
      is_opted_out: e.is_opted_out,
      results_count: Array.isArray(e.naplan_domain_results)
        ? e.naplan_domain_results.length
        : 0,
    }));

    const windowWithCounts = buildWindowWithCounts(
      window as NaplanTestWindow,
      entryMapped,
    );

    const by_year_level = {} as Record<
      import("@/types/domain").NaplanYearLevel,
      { cohort: number; opted_out: number; results_entered: number }
    >;
    for (const yl of NAPLAN_YEAR_LEVELS) {
      const yl_entries = allEntries.filter((e) => e.year_level === yl);
      by_year_level[yl] = {
        cohort: yl_entries.length,
        opted_out: yl_entries.filter((e) => e.is_opted_out).length,
        results_entered: yl_entries
          .filter((e) => !e.is_opted_out)
          .reduce(
            (sum, e) =>
              sum +
              (Array.isArray(e.naplan_domain_results)
                ? e.naplan_domain_results.length
                : 0),
            0,
          ),
      };
    }

    const below_nms_count = allEntries.reduce((sum, e) => {
      if (!Array.isArray(e.naplan_domain_results)) return sum;
      return (
        sum +
        e.naplan_domain_results.filter(
          (r) => r.above_national_minimum === false,
        ).length
      );
    }, 0);

    return success({
      window: windowWithCounts,
      by_year_level,
      below_nms_count,
    });
  } catch (error) {
    console.error("[naplan] getWindowSummary error:", error);
    return failure("Failed to load window summary", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// Export
// ============================================================

export async function exportNaplanData(
  windowId: string,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NAPLAN);
    const supabase = await createSupabaseServerClient();

    const { data: window } = await supabase
      .from("naplan_test_windows")
      .select("collection_year")
      .eq("id", windowId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!window) return failure("Window not found", ErrorCodes.NOT_FOUND);

    const { data: entries, error } = await supabase
      .from("naplan_cohort_entries")
      .select(
        `
        year_level, is_opted_out, opt_out_reason,
        students!inner(first_name, last_name),
        naplan_domain_results(domain, proficiency_level, scaled_score, above_national_minimum)
      `,
      )
      .eq("window_id", windowId);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const rows: string[] = [
      [
        "Year Level",
        "First Name",
        "Last Name",
        "Opted Out",
        "Opt-Out Reason",
        "Reading",
        "Writing",
        "Spelling",
        "Grammar & Punctuation",
        "Numeracy",
        "Below NMS Domains",
      ].join(","),
    ];

    for (const e of entries ?? []) {
      const student = Array.isArray(e.students) ? e.students[0] : e.students;
      const resultsByDomain = (
        (e.naplan_domain_results ?? []) as NaplanDomainResult[]
      ).reduce(
        (acc, r) => {
          acc[r.domain] = r;
          return acc;
        },
        {} as Record<string, NaplanDomainResult>,
      );

      const belowNms = NAPLAN_DOMAINS.filter(
        (d) => resultsByDomain[d] && !resultsByDomain[d].above_national_minimum,
      );

      rows.push(
        [
          e.year_level,
          `"${student?.first_name ?? ""}"`,
          `"${student?.last_name ?? ""}"`,
          e.is_opted_out ? "Yes" : "No",
          `"${e.opt_out_reason ?? ""}"`,
          resultsByDomain["reading"]?.proficiency_level ?? "",
          resultsByDomain["writing"]?.proficiency_level ?? "",
          resultsByDomain["spelling"]?.proficiency_level ?? "",
          resultsByDomain["language_conventions"]?.proficiency_level ?? "",
          resultsByDomain["numeracy"]?.proficiency_level ?? "",
          `"${belowNms.join("; ")}"`,
        ].join(","),
      );
    }

    await logAudit({
      context,
      action: AuditActions.NAPLAN_RESULTS_EXPORTED,
      entityType: "naplan_test_window",
      entityId: windowId,
      metadata: {
        collection_year: window.collection_year,
        row_count: rows.length - 1,
      },
    });

    return success(rows.join("\n"));
  } catch (error) {
    console.error("[naplan] exportNaplanData error:", error);
    return failure("Failed to export NAPLAN data", ErrorCodes.DATABASE_ERROR);
  }
}
