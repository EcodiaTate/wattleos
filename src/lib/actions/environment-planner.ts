"use server";

// src/lib/actions/environment-planner.ts
//
// ============================================================
// Prepared Environment Planner - Server Actions
// ============================================================
// Manages shelf layout plans (environment_plans + plan_shelf_slots)
// and material rotation schedules (rotation_schedules).
// All queries are tenant-scoped via requirePermission + RLS.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success, ErrorCodes } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  EnvironmentPlan,
  EnvironmentPlannerDashboardData,
  EnvironmentPlanWithDetails,
  PlanShelfSlot,
  RotationSchedule,
  RotationScheduleWithDetails,
} from "@/types/domain";
import { ZodError } from "zod";
import {
  BulkUpsertSlotsSchema,
  CompleteRotationSchema,
  CreateEnvironmentPlanSchema,
  CreateRotationScheduleSchema,
  ListEnvironmentPlansSchema,
  ListRotationSchedulesSchema,
  UpdateEnvironmentPlanSchema,
  UpdateRotationScheduleSchema,
  UpsertPlanShelfSlotSchema,
} from "@/lib/validations/environment-planner";
import type {
  BulkUpsertSlotsInput,
  CompleteRotationInput,
  CreateEnvironmentPlanInput,
  CreateRotationScheduleInput,
  ListEnvironmentPlansInput,
  ListRotationSchedulesInput,
  UpdateEnvironmentPlanInput,
  UpdateRotationScheduleInput,
  UpsertPlanShelfSlotInput,
} from "@/lib/validations/environment-planner";

// ============================================================
// Dashboard
// ============================================================

export async function getEnvironmentPlannerDashboard(): Promise<
  ActionResponse<EnvironmentPlannerDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ENVIRONMENT_PLANNER);
    const db = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    const [plansRes, rotationsRes] = await Promise.all([
      db
        .from("environment_plans")
        .select(
          "id, name, status, location_id, theme, effective_from, effective_to, created_at, updated_at",
        )
        .eq("tenant_id", ctx.tenant.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      db
        .from("rotation_schedules")
        .select(
          `
          id, title, theme_type, theme_label, scheduled_date, status,
          location:material_shelf_locations!location_id(id, name)
        `,
        )
        .eq("tenant_id", ctx.tenant.id)
        .is("deleted_at", null)
        .in("status", ["upcoming", "in_progress"])
        .order("scheduled_date", { ascending: true })
        .limit(10),
    ]);

    if (plansRes.error) {
      console.error("[env-planner:dashboard]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error: plansRes.error,
      });
      return failure(plansRes.error.message, ErrorCodes.DATABASE_ERROR);
    }
    if (rotationsRes.error) {
      console.error("[env-planner:dashboard]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error: rotationsRes.error,
      });
      return failure(rotationsRes.error.message, ErrorCodes.DATABASE_ERROR);
    }

    const plans = (plansRes.data ?? []) as EnvironmentPlan[];
    const rotations = (rotationsRes.data ??
      []) as unknown as RotationScheduleWithDetails[];

    const total_plans = plans.length;
    const active_plans = plans.filter((p) => p.status === "active").length;
    const draft_plans = plans.filter((p) => p.status === "draft").length;
    const upcoming_rotations = rotations.filter(
      (r) => r.status === "upcoming",
    ).length;
    const overdue_rotations = rotations.filter(
      (r) => r.status === "upcoming" && r.scheduled_date < today,
    ).length;

    return success({
      total_plans,
      active_plans,
      draft_plans,
      upcoming_rotations,
      overdue_rotations,
      recent_plans: plans.slice(0, 6),
      upcoming_rotation_list: rotations,
    });
  } catch (err) {
    console.error("[env-planner:dashboard]", err);
    return failure("Failed to load environment planner dashboard");
  }
}

// ============================================================
// Plans - list
// ============================================================

export async function listEnvironmentPlans(
  input: ListEnvironmentPlansInput = {},
): Promise<ActionResponse<{ plans: EnvironmentPlan[]; total: number }>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ENVIRONMENT_PLANNER);
    const parsed = ListEnvironmentPlansSchema.parse(input);
    const db = await createSupabaseServerClient();

    const page = parsed.page ?? 1;
    const per_page = parsed.per_page ?? 50;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let query = db
      .from("environment_plans")
      .select("*", { count: "exact" })
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (parsed.status) query = query.eq("status", parsed.status);
    if (parsed.location_id) query = query.eq("location_id", parsed.location_id);

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[env-planner:list]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({
      plans: (data ?? []) as EnvironmentPlan[],
      total: count ?? 0,
    });
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Invalid filter", "VALIDATION_ERROR");
    console.error("[env-planner:list]", err);
    return failure("Failed to list environment plans");
  }
}

// ============================================================
// Plans - get single with slots
// ============================================================

export async function getEnvironmentPlan(
  id: string,
): Promise<ActionResponse<EnvironmentPlanWithDetails>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ENVIRONMENT_PLANNER);
    const db = await createSupabaseServerClient();

    const { data: plan, error: pErr } = await db
      .from("environment_plans")
      .select(
        `
        *,
        location:material_shelf_locations!location_id(id, name, room_type)
      `,
      )
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .single();

    if (pErr || !plan) return failure("Plan not found", "NOT_FOUND");

    const { data: slots, error: sErr } = await db
      .from("plan_shelf_slots")
      .select(
        `
        *,
        inventory_item:material_inventory_items!inventory_item_id(
          id, condition, status,
          material:montessori_materials!material_id(id, name, area, age_level)
        )
      `,
      )
      .eq("plan_id", id)
      .eq("tenant_id", ctx.tenant.id)
      .order("sort_order", { ascending: true })
      .order("slot_label", { ascending: true });

    if (sErr) {
      console.error("[env-planner:get]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error: sErr,
      });
      return failure(sErr.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({
      ...(plan as unknown as EnvironmentPlan),
      location: (
        plan as unknown as { location: EnvironmentPlanWithDetails["location"] }
      ).location,
      slots: (slots ?? []) as unknown as EnvironmentPlanWithDetails["slots"],
    } as EnvironmentPlanWithDetails);
  } catch (err) {
    console.error("[env-planner:get]", err);
    return failure("Failed to load environment plan");
  }
}

// ============================================================
// Plans - create
// ============================================================

export async function createEnvironmentPlan(
  input: CreateEnvironmentPlanInput,
): Promise<ActionResponse<EnvironmentPlan>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = CreateEnvironmentPlanSchema.parse(input);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("environment_plans")
      .insert({
        tenant_id: ctx.tenant.id,
        location_id: parsed.location_id || null,
        name: parsed.name,
        description: parsed.description || null,
        theme: parsed.theme || null,
        effective_from: parsed.effective_from || null,
        effective_to: parsed.effective_to || null,
        notes: parsed.notes || null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[env-planner:create]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ENVIRONMENT_PLAN_CREATED,
        entityType: "environment_plan",
        entityId: null,
        metadata: {
          name: parsed.name,
          location_id: parsed.location_id || null,
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ENVIRONMENT_PLAN_CREATED,
      entityType: "environment_plan",
      entityId: data.id,
      metadata: { name: parsed.name, location_id: parsed.location_id || null },
    });

    return success(data as EnvironmentPlan);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:create]", err);
    return failure("Failed to create environment plan");
  }
}

// ============================================================
// Plans - update
// ============================================================

export async function updateEnvironmentPlan(
  id: string,
  input: UpdateEnvironmentPlanInput,
): Promise<ActionResponse<EnvironmentPlan>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = UpdateEnvironmentPlanSchema.parse(input);
    const db = await createSupabaseServerClient();

    // If activating, must deactivate any other active plan for same location first
    if (parsed.status === "active" && parsed.location_id !== undefined) {
      const { data: current } = await db
        .from("environment_plans")
        .select("location_id")
        .eq("id", id)
        .single();
      const locId =
        parsed.location_id || (current?.location_id as string | null);
      if (locId) {
        await db
          .from("environment_plans")
          .update({ status: "archived" })
          .eq("tenant_id", ctx.tenant.id)
          .eq("location_id", locId)
          .eq("status", "active")
          .neq("id", id)
          .is("deleted_at", null);
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.description !== undefined)
      updates.description = parsed.description || null;
    if (parsed.location_id !== undefined)
      updates.location_id = parsed.location_id || null;
    if (parsed.theme !== undefined) updates.theme = parsed.theme || null;
    if (parsed.effective_from !== undefined)
      updates.effective_from = parsed.effective_from || null;
    if (parsed.effective_to !== undefined)
      updates.effective_to = parsed.effective_to || null;
    if (parsed.notes !== undefined) updates.notes = parsed.notes || null;
    if (parsed.status !== undefined) updates.status = parsed.status;

    const { data, error } = await db
      .from("environment_plans")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[env-planner:update]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ENVIRONMENT_PLAN_UPDATED,
        entityType: "environment_plan",
        entityId: id,
        metadata: { ...updates, failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ENVIRONMENT_PLAN_UPDATED,
      entityType: "environment_plan",
      entityId: id,
      metadata: updates,
    });

    return success(data as EnvironmentPlan);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:update]", err);
    return failure("Failed to update environment plan");
  }
}

// ============================================================
// Plans - delete (soft)
// ============================================================

export async function deleteEnvironmentPlan(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("environment_plans")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (error) {
      console.error("[env-planner:delete]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ENVIRONMENT_PLAN_DELETED,
        entityType: "environment_plan",
        entityId: id,
        metadata: { failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ENVIRONMENT_PLAN_DELETED,
      entityType: "environment_plan",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    console.error("[env-planner:delete]", err);
    return failure("Failed to delete environment plan");
  }
}

// ============================================================
// Shelf Slots - upsert single
// ============================================================

export async function upsertPlanShelfSlot(
  input: UpsertPlanShelfSlotInput,
): Promise<ActionResponse<PlanShelfSlot>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = UpsertPlanShelfSlotSchema.parse(input);
    const db = await createSupabaseServerClient();

    // Verify the plan belongs to this tenant
    const { data: plan, error: planErr } = await db
      .from("environment_plans")
      .select("id")
      .eq("id", parsed.plan_id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .single();

    if (planErr || !plan) return failure("Plan not found", "NOT_FOUND");

    const { data, error } = await db
      .from("plan_shelf_slots")
      .upsert(
        {
          tenant_id: ctx.tenant.id,
          plan_id: parsed.plan_id,
          slot_label: parsed.slot_label,
          inventory_item_id: parsed.inventory_item_id || null,
          sort_order: parsed.sort_order ?? 0,
          area: parsed.area || null,
          age_range_notes: parsed.age_range_notes || null,
          notes: parsed.notes || null,
        },
        { onConflict: "plan_id,slot_label" },
      )
      .select()
      .single();

    if (error) {
      console.error("[env-planner:upsert-slot]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        plan_id: parsed.plan_id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ENVIRONMENT_SLOT_UPDATED,
        entityType: "plan_shelf_slot",
        entityId: null,
        metadata: {
          plan_id: parsed.plan_id,
          slot_label: parsed.slot_label,
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ENVIRONMENT_SLOT_UPDATED,
      entityType: "plan_shelf_slot",
      entityId: data.id,
      metadata: { plan_id: parsed.plan_id, slot_label: parsed.slot_label },
    });

    return success(data as PlanShelfSlot);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:upsert-slot]", err);
    return failure("Failed to save shelf slot");
  }
}

// ============================================================
// Shelf Slots - bulk upsert (full plan layout replace)
// ============================================================

export async function bulkUpsertPlanSlots(
  input: BulkUpsertSlotsInput,
): Promise<ActionResponse<{ count: number }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = BulkUpsertSlotsSchema.parse(input);
    const db = await createSupabaseServerClient();

    const { data: plan, error: planErr } = await db
      .from("environment_plans")
      .select("id")
      .eq("id", parsed.plan_id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .single();

    if (planErr || !plan) return failure("Plan not found", "NOT_FOUND");

    const rows = parsed.slots.map((slot, idx) => ({
      tenant_id: ctx.tenant.id,
      plan_id: parsed.plan_id,
      slot_label: slot.slot_label,
      inventory_item_id: slot.inventory_item_id || null,
      sort_order: slot.sort_order ?? idx,
      area: slot.area || null,
      age_range_notes: slot.age_range_notes || null,
      notes: slot.notes || null,
    }));

    const { error } = await db
      .from("plan_shelf_slots")
      .upsert(rows, { onConflict: "plan_id,slot_label" });

    if (error) {
      console.error("[env-planner:bulk-slots]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        plan_id: parsed.plan_id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ENVIRONMENT_PLAN_UPDATED,
        entityType: "environment_plan",
        entityId: parsed.plan_id,
        metadata: {
          slot_count: rows.length,
          action: "bulk_upsert",
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ENVIRONMENT_PLAN_UPDATED,
      entityType: "environment_plan",
      entityId: parsed.plan_id,
      metadata: { slot_count: rows.length, action: "bulk_upsert" },
    });

    return success({ count: rows.length });
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:bulk-slots]", err);
    return failure("Failed to save shelf layout");
  }
}

// ============================================================
// Shelf Slots - delete
// ============================================================

export async function deletePlanShelfSlot(
  slotId: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("plan_shelf_slots")
      .delete()
      .eq("id", slotId)
      .eq("tenant_id", ctx.tenant.id);

    if (error) {
      console.error("[env-planner:delete-slot]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        slotId,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(undefined);
  } catch (err) {
    console.error("[env-planner:delete-slot]", err);
    return failure("Failed to delete slot");
  }
}

// ============================================================
// Rotation Schedules - list
// ============================================================

export async function listRotationSchedules(
  input: ListRotationSchedulesInput = {},
): Promise<
  ActionResponse<{ schedules: RotationScheduleWithDetails[]; total: number }>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ENVIRONMENT_PLANNER);
    const parsed = ListRotationSchedulesSchema.parse(input);
    const db = await createSupabaseServerClient();

    const page = parsed.page ?? 1;
    const per_page = parsed.per_page ?? 50;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let query = db
      .from("rotation_schedules")
      .select(
        `
        *,
        location:material_shelf_locations!location_id(id, name)
      `,
        { count: "exact" },
      )
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (parsed.status) query = query.eq("status", parsed.status);
    if (parsed.location_id) query = query.eq("location_id", parsed.location_id);
    if (parsed.from_date) query = query.gte("scheduled_date", parsed.from_date);
    if (parsed.to_date) query = query.lte("scheduled_date", parsed.to_date);

    const { data, error, count } = await query
      .order("scheduled_date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[env-planner:rotations:list]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({
      schedules: (data ?? []) as unknown as RotationScheduleWithDetails[],
      total: count ?? 0,
    });
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Invalid filter", "VALIDATION_ERROR");
    console.error("[env-planner:rotations:list]", err);
    return failure("Failed to list rotation schedules");
  }
}

// ============================================================
// Rotation Schedules - create
// ============================================================

export async function createRotationSchedule(
  input: CreateRotationScheduleInput,
): Promise<ActionResponse<RotationSchedule>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = CreateRotationScheduleSchema.parse(input);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("rotation_schedules")
      .insert({
        tenant_id: ctx.tenant.id,
        location_id: parsed.location_id || null,
        plan_id: parsed.plan_id || null,
        title: parsed.title,
        theme_type: parsed.theme_type,
        theme_label: parsed.theme_label || null,
        scheduled_date: parsed.scheduled_date,
        rationale: parsed.rationale || null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[env-planner:rotations:create]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ROTATION_SCHEDULE_CREATED,
        entityType: "rotation_schedule",
        entityId: null,
        metadata: {
          title: parsed.title,
          scheduled_date: parsed.scheduled_date,
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ROTATION_SCHEDULE_CREATED,
      entityType: "rotation_schedule",
      entityId: data.id,
      metadata: { title: parsed.title, scheduled_date: parsed.scheduled_date },
    });

    return success(data as RotationSchedule);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:rotations:create]", err);
    return failure("Failed to create rotation schedule");
  }
}

// ============================================================
// Rotation Schedules - update
// ============================================================

export async function updateRotationSchedule(
  id: string,
  input: UpdateRotationScheduleInput,
): Promise<ActionResponse<RotationSchedule>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = UpdateRotationScheduleSchema.parse(input);
    const db = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (parsed.title !== undefined) updates.title = parsed.title;
    if (parsed.theme_type !== undefined) updates.theme_type = parsed.theme_type;
    if (parsed.theme_label !== undefined)
      updates.theme_label = parsed.theme_label || null;
    if (parsed.scheduled_date !== undefined)
      updates.scheduled_date = parsed.scheduled_date;
    if (parsed.rationale !== undefined)
      updates.rationale = parsed.rationale || null;
    if (parsed.location_id !== undefined)
      updates.location_id = parsed.location_id || null;
    if (parsed.plan_id !== undefined) updates.plan_id = parsed.plan_id || null;
    if (parsed.status !== undefined) updates.status = parsed.status;

    const { data, error } = await db
      .from("rotation_schedules")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[env-planner:rotations:update]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ROTATION_SCHEDULE_UPDATED,
        entityType: "rotation_schedule",
        entityId: id,
        metadata: { ...updates, failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ROTATION_SCHEDULE_UPDATED,
      entityType: "rotation_schedule",
      entityId: id,
      metadata: updates,
    });

    return success(data as RotationSchedule);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:rotations:update]", err);
    return failure("Failed to update rotation schedule");
  }
}

// ============================================================
// Rotation Schedules - complete (log outcome)
// ============================================================

export async function completeRotationSchedule(
  id: string,
  input: CompleteRotationInput,
): Promise<ActionResponse<RotationSchedule>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const parsed = CompleteRotationSchema.parse(input);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("rotation_schedules")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: ctx.user.id,
        materials_added: parsed.materials_added || null,
        materials_removed: parsed.materials_removed || null,
        outcome_notes: parsed.outcome_notes || null,
      })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[env-planner:rotations:complete]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ROTATION_SCHEDULE_COMPLETED,
        entityType: "rotation_schedule",
        entityId: id,
        metadata: {
          outcome_notes: parsed.outcome_notes || null,
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ROTATION_SCHEDULE_COMPLETED,
      entityType: "rotation_schedule",
      entityId: id,
      metadata: { outcome_notes: parsed.outcome_notes || null },
    });

    return success(data as RotationSchedule);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[env-planner:rotations:complete]", err);
    return failure("Failed to complete rotation");
  }
}

// ============================================================
// Rotation Schedules - cancel
// ============================================================

export async function cancelRotationSchedule(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("rotation_schedules")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (error) {
      console.error("[env-planner:rotations:cancel]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.ROTATION_SCHEDULE_CANCELLED,
        entityType: "rotation_schedule",
        entityId: id,
        metadata: { failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.ROTATION_SCHEDULE_CANCELLED,
      entityType: "rotation_schedule",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    console.error("[env-planner:rotations:cancel]", err);
    return failure("Failed to cancel rotation schedule");
  }
}

// ============================================================
// Rotation Schedules - delete (soft)
// ============================================================

export async function deleteRotationSchedule(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ENVIRONMENT_PLANNER);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("rotation_schedules")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (error) {
      console.error("[env-planner:rotations:delete]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(undefined);
  } catch (err) {
    console.error("[env-planner:rotations:delete]", err);
    return failure("Failed to delete rotation schedule");
  }
}
