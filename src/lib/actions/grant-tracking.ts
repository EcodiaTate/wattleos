// src/lib/actions/grant-tracking.ts
//
// ============================================================
// WattleOS V2 - Grant Tracking Server Actions
// ============================================================
// Manages the full grant lifecycle:
//   1. CRUD for grants, milestones, expenditures
//   2. Status transitions (draft → submitted → approved → active → acquitted → closed)
//   3. Budget tracking (spent_cents updated on expenditure changes)
//   4. Dashboard aggregates + CSV export
//
// AUDIT: All mutations are logged for financial compliance.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  Grant,
  GrantDashboardData,
  GrantExpenditure,
  GrantMilestone,
  GrantWithDetails,
} from "@/types/domain";
import {
  createExpenditureSchema,
  createGrantSchema,
  createMilestoneSchema,
  grantExportSchema,
  listGrantsSchema,
  updateExpenditureSchema,
  updateGrantSchema,
  updateMilestoneSchema,
  type CreateExpenditureInput,
  type CreateGrantInput,
  type CreateMilestoneInput,
  type GrantExportInput,
  type ListGrantsInput,
  type UpdateExpenditureInput,
  type UpdateGrantInput,
  type UpdateMilestoneInput,
} from "@/lib/validations/grant-tracking";

// ── Helpers ─────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getGrantDashboard(): Promise<
  ActionResponse<GrantDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch all grants
    const { data: grants, error: grantsErr } = await supabase
      .from("grants")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (grantsErr) return failure(grantsErr.message, ErrorCodes.DATABASE_ERROR);

    const all = (grants ?? []) as Grant[];

    // Status breakdown
    const statusMap = new Map<string, { count: number; total_cents: number }>();
    all.forEach((g) => {
      const existing = statusMap.get(g.status) ?? { count: 0, total_cents: 0 };
      statusMap.set(g.status, {
        count: existing.count + 1,
        total_cents: existing.total_cents + g.amount_cents,
      });
    });

    // Category breakdown
    const categoryMap = new Map<
      string,
      { count: number; total_cents: number }
    >();
    all.forEach((g) => {
      const existing = categoryMap.get(g.category) ?? {
        count: 0,
        total_cents: 0,
      };
      categoryMap.set(g.category, {
        count: existing.count + 1,
        total_cents: existing.total_cents + g.amount_cents,
      });
    });

    const activeGrants = all.filter((g) => g.status === "active");
    const totalAwarded = all
      .filter((g) => ["approved", "active", "acquitted"].includes(g.status))
      .reduce((sum, g) => sum + g.amount_cents, 0);
    const totalSpent = all.reduce((sum, g) => sum + g.spent_cents, 0);

    // Upcoming acquittals (next 90 days, active grants only)
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 86_400_000);
    const upcomingAcquittals = all
      .filter(
        (g) =>
          g.status === "active" &&
          g.acquittal_due_date &&
          new Date(g.acquittal_due_date) <= in90Days &&
          new Date(g.acquittal_due_date) >= now,
      )
      .sort((a, b) =>
        (a.acquittal_due_date ?? "").localeCompare(b.acquittal_due_date ?? ""),
      );

    // Overdue milestones
    const today = now.toISOString().slice(0, 10);
    const { data: overdueMilestones } = await supabase
      .from("grant_milestones")
      .select("*, grant:grants(name)")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "in_progress"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(20);

    const formattedMilestones = (overdueMilestones ?? []).map(
      (m: Record<string, unknown>) => {
        const grantArr = m.grant as
          | { name: string }[]
          | { name: string }
          | null;
        const grantObj = Array.isArray(grantArr) ? grantArr[0] : grantArr;
        return {
          ...(m as unknown as GrantMilestone),
          grant_name: grantObj?.name ?? "Unknown",
        };
      },
    );

    return success({
      total_grants: all.length,
      active_grants: activeGrants.length,
      total_awarded_cents: totalAwarded,
      total_spent_cents: totalSpent,
      by_status: Array.from(statusMap.entries()).map(([status, data]) => ({
        status: status as Grant["status"],
        ...data,
      })),
      by_category: Array.from(categoryMap.entries()).map(
        ([category, data]) => ({
          category: category as Grant["category"],
          ...data,
        }),
      ),
      upcoming_acquittals: upcomingAcquittals,
      overdue_milestones: formattedMilestones,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GRANTS - CRUD
// ============================================================

export async function createGrant(
  input: CreateGrantInput,
): Promise<ActionResponse<Grant>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = createGrantSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("grants")
      .insert({
        tenant_id: context.tenant.id,
        name: v.name,
        reference_number: v.reference_number,
        funding_body: v.funding_body,
        amount_cents: v.amount_cents,
        start_date: v.start_date,
        end_date: v.end_date,
        acquittal_due_date: v.acquittal_due_date,
        status: v.status,
        category: v.category,
        managed_by_user_id: v.managed_by_user_id,
        description: v.description,
        conditions: v.conditions,
        internal_notes: v.internal_notes,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    const grant = data as Grant;

    await logAudit({
      context,
      action: AuditActions.GRANT_CREATED,
      entityType: "grant",
      entityId: grant.id,
      metadata: {
        name: v.name,
        amount_cents: v.amount_cents,
        funding_body: v.funding_body,
      },
    });

    return success(grant);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateGrant(
  input: UpdateGrantInput,
): Promise<ActionResponse<Grant>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = updateGrantSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Build update payload - only include non-null fields
    const update: Record<string, unknown> = {};
    if (v.name !== null) update.name = v.name;
    if (v.reference_number !== null)
      update.reference_number = v.reference_number;
    if (v.funding_body !== null) update.funding_body = v.funding_body;
    if (v.amount_cents !== null) update.amount_cents = v.amount_cents;
    if (v.start_date !== null) update.start_date = v.start_date;
    if (v.end_date !== null) update.end_date = v.end_date;
    if (v.acquittal_due_date !== null)
      update.acquittal_due_date = v.acquittal_due_date;
    if (v.category !== null) update.category = v.category;
    if (v.managed_by_user_id !== null)
      update.managed_by_user_id = v.managed_by_user_id;
    if (v.description !== null) update.description = v.description;
    if (v.conditions !== null) update.conditions = v.conditions;
    if (v.internal_notes !== null) update.internal_notes = v.internal_notes;

    // Status change is a separate audit event
    const statusChanged = v.status !== null;
    if (v.status !== null) {
      update.status = v.status;
      if (v.status === "acquitted") {
        update.acquitted_at = new Date().toISOString();
      }
    }

    if (Object.keys(update).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("grants")
      .update(update)
      .eq("id", v.id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    const grant = data as Grant;

    if (statusChanged) {
      await logAudit({
        context,
        action: AuditActions.GRANT_STATUS_CHANGED,
        entityType: "grant",
        entityId: grant.id,
        metadata: { name: grant.name, new_status: v.status },
      });
    } else {
      await logAudit({
        context,
        action: AuditActions.GRANT_UPDATED,
        entityType: "grant",
        entityId: grant.id,
        metadata: { name: grant.name, fields: Object.keys(update) },
      });
    }

    return success(grant);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteGrant(
  grantId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    // Fetch name for audit log before deleting
    const { data: existing } = await supabase
      .from("grants")
      .select("name")
      .eq("id", grantId)
      .eq("tenant_id", context.tenant.id)
      .single();

    const { error } = await supabase
      .from("grants")
      .delete()
      .eq("id", grantId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.GRANT_DELETED,
      entityType: "grant",
      entityId: grantId,
      metadata: { name: (existing as { name: string } | null)?.name },
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listGrants(
  input?: ListGrantsInput,
): Promise<ActionResponse<Grant[]>> {
  try {
    await requirePermission(Permissions.VIEW_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = listGrantsSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    let query = supabase
      .from("grants")
      .select("*")
      .order("created_at", { ascending: false })
      .range(v.offset, v.offset + v.limit - 1);

    if (v.status) query = query.eq("status", v.status);
    if (v.category) query = query.eq("category", v.category);

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as Grant[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getGrant(
  grantId: string,
): Promise<ActionResponse<GrantWithDetails>> {
  try {
    const context = await requirePermission(Permissions.VIEW_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("grants")
      .select(
        `
        *,
        managed_by_user:auth_users_view(id, first_name, last_name, email)
      `,
      )
      .eq("id", grantId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error) return failure(error.message, ErrorCodes.NOT_FOUND);

    const grant = data as Record<string, unknown>;

    // Supabase join may return array
    const userArr = grant.managed_by_user;
    const managedByUser = Array.isArray(userArr)
      ? (userArr[0] ?? null)
      : (userArr ?? null);

    // Fetch milestone stats
    const { data: milestones } = await supabase
      .from("grant_milestones")
      .select("status")
      .eq("grant_id", grantId)
      .eq("tenant_id", context.tenant.id);

    const ms = milestones ?? [];
    const milestonesTotal = ms.length;
    const milestonesCompleted = ms.filter(
      (m: { status: string }) => m.status === "completed",
    ).length;
    const milestonesOverdue = ms.filter(
      (m: { status: string }) => m.status === "overdue",
    ).length;

    const g = grant as unknown as Grant;
    const remainingCents = Math.max(0, g.amount_cents - g.spent_cents);
    const spendPct =
      g.amount_cents > 0
        ? Math.round((g.spent_cents / g.amount_cents) * 100)
        : 0;

    const result: GrantWithDetails = {
      ...g,
      managed_by_user: managedByUser as GrantWithDetails["managed_by_user"],
      milestones_total: milestonesTotal,
      milestones_completed: milestonesCompleted,
      milestones_overdue: milestonesOverdue,
      remaining_cents: remainingCents,
      spend_pct: spendPct,
    };

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// MILESTONES
// ============================================================

export async function createMilestone(
  input: CreateMilestoneInput,
): Promise<ActionResponse<GrantMilestone>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = createMilestoneSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("grant_milestones")
      .insert({
        tenant_id: context.tenant.id,
        grant_id: v.grant_id,
        title: v.title,
        description: v.description,
        due_date: v.due_date,
        notes: v.notes,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.GRANT_MILESTONE_CREATED,
      entityType: "grant_milestone",
      entityId: (data as GrantMilestone).id,
      metadata: { grant_id: v.grant_id, title: v.title },
    });

    return success(data as GrantMilestone);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateMilestone(
  input: UpdateMilestoneInput,
): Promise<ActionResponse<GrantMilestone>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = updateMilestoneSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const update: Record<string, unknown> = {};
    if (v.title !== null) update.title = v.title;
    if (v.description !== null) update.description = v.description;
    if (v.due_date !== null) update.due_date = v.due_date;
    if (v.notes !== null) update.notes = v.notes;

    const isCompleting = v.status === "completed";
    if (v.status !== null) {
      update.status = v.status;
      if (isCompleting) {
        update.completed_at = new Date().toISOString();
        update.completed_by_user_id = context.user.id;
      }
    }

    const { data, error } = await supabase
      .from("grant_milestones")
      .update(update)
      .eq("id", v.id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    const milestone = data as GrantMilestone;

    await logAudit({
      context,
      action: isCompleting
        ? AuditActions.GRANT_MILESTONE_COMPLETED
        : AuditActions.GRANT_MILESTONE_UPDATED,
      entityType: "grant_milestone",
      entityId: milestone.id,
      metadata: { grant_id: milestone.grant_id, title: milestone.title },
    });

    return success(milestone);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteMilestone(
  milestoneId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("grant_milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.GRANT_MILESTONE_DELETED,
      entityType: "grant_milestone",
      entityId: milestoneId,
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listMilestones(
  grantId: string,
): Promise<ActionResponse<GrantMilestone[]>> {
  try {
    await requirePermission(Permissions.VIEW_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("grant_milestones")
      .select("*")
      .eq("grant_id", grantId)
      .order("due_date", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as GrantMilestone[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPENDITURES
// ============================================================

export async function createExpenditure(
  input: CreateExpenditureInput,
): Promise<ActionResponse<GrantExpenditure>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = createExpenditureSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("grant_expenditures")
      .insert({
        tenant_id: context.tenant.id,
        grant_id: v.grant_id,
        description: v.description,
        amount_cents: v.amount_cents,
        date: v.date,
        category: v.category,
        receipt_reference: v.receipt_reference,
        recorded_by_user_id: context.user.id,
        notes: v.notes,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    // Update the grant's spent_cents
    await supabase
      .rpc("increment_grant_spent", {
        p_grant_id: v.grant_id,
        p_amount: v.amount_cents,
      })
      .then(undefined, () => {
        // Fallback: manual increment if RPC doesn't exist
        return supabase
          .from("grants")
          .select("spent_cents")
          .eq("id", v.grant_id)
          .single()
          .then(({ data: g }) => {
            if (g) {
              return supabase
                .from("grants")
                .update({
                  spent_cents:
                    (g as { spent_cents: number }).spent_cents + v.amount_cents,
                })
                .eq("id", v.grant_id);
            }
          });
      });

    await logAudit({
      context,
      action: AuditActions.GRANT_EXPENDITURE_CREATED,
      entityType: "grant_expenditure",
      entityId: (data as GrantExpenditure).id,
      metadata: {
        grant_id: v.grant_id,
        amount_cents: v.amount_cents,
        description: v.description,
      },
    });

    return success(data as GrantExpenditure);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateExpenditure(
  input: UpdateExpenditureInput,
): Promise<ActionResponse<GrantExpenditure>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = updateExpenditureSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // If amount_cents changed, need to adjust grant spent_cents
    let oldAmountCents: number | null = null;
    if (v.amount_cents !== null) {
      const { data: existing } = await supabase
        .from("grant_expenditures")
        .select("amount_cents, grant_id")
        .eq("id", v.id)
        .single();
      if (existing) {
        oldAmountCents = (existing as { amount_cents: number }).amount_cents;
      }
    }

    const update: Record<string, unknown> = {};
    if (v.description !== null) update.description = v.description;
    if (v.amount_cents !== null) update.amount_cents = v.amount_cents;
    if (v.date !== null) update.date = v.date;
    if (v.category !== null) update.category = v.category;
    if (v.receipt_reference !== null)
      update.receipt_reference = v.receipt_reference;
    if (v.notes !== null) update.notes = v.notes;

    const { data, error } = await supabase
      .from("grant_expenditures")
      .update(update)
      .eq("id", v.id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    const expenditure = data as GrantExpenditure;

    // Adjust grant spent_cents if amount changed
    if (v.amount_cents !== null && oldAmountCents !== null) {
      const diff = v.amount_cents - oldAmountCents;
      if (diff !== 0) {
        const { data: grant } = await supabase
          .from("grants")
          .select("spent_cents")
          .eq("id", expenditure.grant_id)
          .single();
        if (grant) {
          await supabase
            .from("grants")
            .update({
              spent_cents: Math.max(
                0,
                (grant as { spent_cents: number }).spent_cents + diff,
              ),
            })
            .eq("id", expenditure.grant_id);
        }
      }
    }

    await logAudit({
      context,
      action: AuditActions.GRANT_EXPENDITURE_UPDATED,
      entityType: "grant_expenditure",
      entityId: expenditure.id,
      metadata: { grant_id: expenditure.grant_id },
    });

    return success(expenditure);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteExpenditure(
  expenditureId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    // Fetch amount and grant_id before deleting to adjust spent_cents
    const { data: existing } = await supabase
      .from("grant_expenditures")
      .select("amount_cents, grant_id")
      .eq("id", expenditureId)
      .eq("tenant_id", context.tenant.id)
      .single();

    const { error } = await supabase
      .from("grant_expenditures")
      .delete()
      .eq("id", expenditureId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    // Decrement grant spent_cents
    if (existing) {
      const ex = existing as { amount_cents: number; grant_id: string };
      const { data: grant } = await supabase
        .from("grants")
        .select("spent_cents")
        .eq("id", ex.grant_id)
        .single();
      if (grant) {
        await supabase
          .from("grants")
          .update({
            spent_cents: Math.max(
              0,
              (grant as { spent_cents: number }).spent_cents - ex.amount_cents,
            ),
          })
          .eq("id", ex.grant_id);
      }
    }

    await logAudit({
      context,
      action: AuditActions.GRANT_EXPENDITURE_DELETED,
      entityType: "grant_expenditure",
      entityId: expenditureId,
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listExpenditures(
  grantId: string,
): Promise<ActionResponse<GrantExpenditure[]>> {
  try {
    await requirePermission(Permissions.VIEW_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("grant_expenditures")
      .select("*")
      .eq("grant_id", grantId)
      .order("date", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as GrantExpenditure[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT
// ============================================================

export async function exportGrants(
  input?: GrantExportInput,
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  try {
    const context = await requirePermission(Permissions.VIEW_GRANT_TRACKING);
    const supabase = await createSupabaseServerClient();

    const parsed = grantExportSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    let query = supabase
      .from("grants")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("name");

    if (v.statuses.length > 0) {
      query = query.in("status", v.statuses);
    }

    const { data: grants, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const allGrants = (grants ?? []) as Grant[];

    // Build CSV
    const headers = [
      "Grant Name",
      "Reference",
      "Funding Body",
      "Status",
      "Category",
      "Amount (AUD)",
      "Spent (AUD)",
      "Remaining (AUD)",
      "Start Date",
      "End Date",
      "Acquittal Due",
    ];

    const rows = allGrants.map((g) => [
      `"${g.name.replace(/"/g, '""')}"`,
      g.reference_number ?? "",
      `"${g.funding_body.replace(/"/g, '""')}"`,
      g.status,
      g.category,
      formatCents(g.amount_cents),
      formatCents(g.spent_cents),
      formatCents(Math.max(0, g.amount_cents - g.spent_cents)),
      g.start_date,
      g.end_date,
      g.acquittal_due_date ?? "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `grants_export_${new Date().toISOString().slice(0, 10)}.csv`;

    await logAudit({
      context,
      action: AuditActions.GRANT_EXPORTED,
      entityType: "grant",
      metadata: { count: allGrants.length, statuses: v.statuses },
    });

    return success({ csv, filename });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
