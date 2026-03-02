"use server";

// src/lib/actions/materials.ts
//
// ============================================================
// Material / Shelf Inventory - Server Actions
// ============================================================
// Manages the physical Montessori material inventory for a
// prepared environment. All queries are tenant-scoped via
// requirePermission + Supabase RLS.
//
// "Date introduced to each child" is derived live from
// lesson_records (first presentation_date per student+material)
// - no extra table or denormalisation required.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { INSPECTION_OVERDUE_DAYS } from "@/lib/constants/materials";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success, ErrorCodes } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  MaterialInventoryDashboardData,
  MaterialInventoryItem,
  MaterialInventoryItemWithDetails,
  MaterialShelfLocation,
  MaterialStudentIntroduction,
  MontessoriArea,
} from "@/types/domain";
import { ZodError } from "zod";
import {
  CreateInventoryItemSchema,
  CreateShelfLocationSchema,
  ListInventoryItemsSchema,
  RecordInspectionSchema,
  UpdateInventoryItemSchema,
  UpdateItemConditionSchema,
  UpdateItemStatusSchema,
  UpdateShelfLocationSchema,
} from "@/lib/validations/materials";
import type {
  CreateInventoryItemInput,
  CreateShelfLocationInput,
  ListInventoryItemsInput,
  RecordInspectionInput,
  UpdateInventoryItemInput,
  UpdateItemConditionInput,
  UpdateItemStatusInput,
  UpdateShelfLocationInput,
} from "@/lib/validations/materials";

// ────────────────────────────────────────────────────────────
// Helper: inspection overdue cutoff date string (YYYY-MM-DD)
// ────────────────────────────────────────────────────────────

function overdueCutoff(): string {
  const d = new Date();
  d.setDate(d.getDate() - INSPECTION_OVERDUE_DAYS);
  return d.toISOString().split("T")[0];
}

// ============================================================
// Dashboard
// ============================================================

export async function getMaterialInventoryDashboard(): Promise<
  ActionResponse<MaterialInventoryDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MATERIAL_INVENTORY);
    const db = await createSupabaseServerClient();

    const { data: items, error } = await db
      .from("material_inventory_items")
      .select(
        `
        id, condition, status, tenant_id, material_id, location_id,
        last_inspected_at, quantity, shelf_position, date_acquired,
        serial_number, photo_url, notes, created_by, created_at, updated_at, deleted_at,
        material:montessori_materials!material_id(id, name, area, age_level, sequence_order),
        location:material_shelf_locations!location_id(id, name, room_type)
        `,
      )
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (error) {
      console.error("[materials:dashboard]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const allItems = (items ??
      []) as unknown as MaterialInventoryItemWithDetails[];
    const cutoff = overdueCutoff();

    const total_items = allItems.length;
    const available_count = allItems.filter(
      (i) => i.status === "available",
    ).length;
    const in_use_count = allItems.filter((i) => i.status === "in_use").length;
    const being_repaired_count = allItems.filter(
      (i) => i.status === "being_repaired",
    ).length;
    const on_order_count = allItems.filter(
      (i) => i.status === "on_order",
    ).length;
    const retired_count = allItems.filter((i) => i.status === "retired").length;
    const needs_attention_items = allItems.filter(
      (i) =>
        (i.condition === "fair" || i.condition === "damaged") &&
        i.status !== "retired",
    );
    const inspection_overdue_items = allItems.filter(
      (i) =>
        i.status !== "retired" &&
        (i.last_inspected_at === null || i.last_inspected_at < cutoff),
    );

    // by_area breakdown
    const areas: MontessoriArea[] = [
      "practical_life",
      "sensorial",
      "language",
      "mathematics",
      "cultural",
    ];
    const by_area = Object.fromEntries(
      areas.map((area) => {
        const areaItems = allItems.filter(
          (i) => i.material?.area === area && i.status !== "retired",
        );
        return [
          area,
          {
            total: areaItems.length,
            available: areaItems.filter((i) => i.status === "available").length,
            needs_attention: areaItems.filter(
              (i) => i.condition === "fair" || i.condition === "damaged",
            ).length,
          },
        ];
      }),
    ) as MaterialInventoryDashboardData["by_area"];

    return success({
      total_items,
      available_count,
      in_use_count,
      being_repaired_count,
      on_order_count,
      retired_count,
      needs_attention_count: needs_attention_items.length,
      inspection_overdue_count: inspection_overdue_items.length,
      by_area,
      needs_attention_items: needs_attention_items.slice(0, 10),
      inspection_overdue_items: inspection_overdue_items.slice(0, 10),
    });
  } catch (err) {
    console.error("[materials:dashboard]", err);
    return failure("Failed to load inventory dashboard");
  }
}

// ============================================================
// List inventory items (with filtering)
// ============================================================

export async function listInventoryItems(
  input: ListInventoryItemsInput = {},
): Promise<
  ActionResponse<{ items: MaterialInventoryItemWithDetails[]; total: number }>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MATERIAL_INVENTORY);
    const parsed = ListInventoryItemsSchema.parse(input);
    const db = await createSupabaseServerClient();
    const cutoff = overdueCutoff();

    const page = parsed.page ?? 1;
    const per_page = parsed.per_page ?? 50;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let query = db
      .from("material_inventory_items")
      .select(
        `
        *,
        material:montessori_materials!material_id(id, name, area, age_level, sequence_order),
        location:material_shelf_locations!location_id(id, name, room_type)
        `,
        { count: "exact" },
      )
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (parsed.status) query = query.eq("status", parsed.status);
    if (parsed.condition) query = query.eq("condition", parsed.condition);
    if (parsed.location_id) query = query.eq("location_id", parsed.location_id);

    if (parsed.needs_attention_only) {
      query = query
        .in("condition", ["fair", "damaged"])
        .neq("status", "retired");
    }

    if (parsed.inspection_overdue_only) {
      // Items where last_inspected_at is null or older than cutoff
      query = query
        .or(`last_inspected_at.is.null,last_inspected_at.lt.${cutoff}`)
        .neq("status", "retired");
    }

    // area and age_level filters require joining to montessori_materials
    // Supabase doesn't support filter by joined column directly, so we fetch then filter
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[materials:list]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    let items = (data ?? []) as MaterialInventoryItemWithDetails[];

    if (parsed.area) {
      items = items.filter((i) => i.material?.area === parsed.area);
    }
    if (parsed.age_level) {
      items = items.filter((i) => i.material?.age_level === parsed.age_level);
    }
    if (parsed.search) {
      const q = parsed.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.material?.name?.toLowerCase().includes(q) ||
          i.shelf_position?.toLowerCase().includes(q) ||
          i.serial_number?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q),
      );
    }

    return success({ items, total: count ?? items.length });
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Invalid filter", "VALIDATION_ERROR");
    console.error("[materials:list]", err);
    return failure("Failed to load inventory items");
  }
}

// ============================================================
// Get single item (with student introduction history)
// ============================================================

export async function getInventoryItem(id: string): Promise<
  ActionResponse<{
    item: MaterialInventoryItemWithDetails;
    student_introductions: MaterialStudentIntroduction[];
  }>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MATERIAL_INVENTORY);
    const db = await createSupabaseServerClient();

    const { data: item, error } = await db
      .from("material_inventory_items")
      .select(
        `
        *,
        material:montessori_materials!material_id(id, name, area, age_level, sequence_order),
        location:material_shelf_locations!location_id(id, name, room_type)
        `,
      )
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error || !item) {
      return failure("Inventory item not found", "NOT_FOUND");
    }

    // Derive student introductions from lesson_records
    // First lesson per (student, material) pair
    const { data: lessons, error: lErr } = await db
      .from("lesson_records")
      .select(
        `
        student_id, stage, presentation_date,
        student:students!student_id(id, first_name, last_name)
        `,
      )
      .eq("tenant_id", ctx.tenant.id)
      .eq("material_id", (item as MaterialInventoryItemWithDetails).material_id)
      .order("presentation_date", { ascending: true });

    if (lErr) {
      console.error("[materials:get]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error: lErr,
      });
      return failure(lErr.message, ErrorCodes.DATABASE_ERROR);
    }

    // Group by student_id
    const byStudent = new Map<
      string,
      {
        student_id: string;
        student_first_name: string;
        student_last_name: string;
        first_introduced_date: string;
        latest_stage: string;
        latest_stage_date: string;
        total_lesson_count: number;
      }
    >();

    for (const lr of lessons ?? []) {
      const sid = lr.student_id as string;
      const studentRaw = lr.student;
      const student = (
        Array.isArray(studentRaw) ? studentRaw[0] : studentRaw
      ) as { id: string; first_name: string; last_name: string } | null;
      if (!student) continue;

      if (!byStudent.has(sid)) {
        byStudent.set(sid, {
          student_id: sid,
          student_first_name: student.first_name,
          student_last_name: student.last_name,
          first_introduced_date: lr.presentation_date as string,
          latest_stage: lr.stage as string,
          latest_stage_date: lr.presentation_date as string,
          total_lesson_count: 1,
        });
      } else {
        const entry = byStudent.get(sid)!;
        entry.total_lesson_count += 1;
        // Update latest stage (mastery > practice > introduction)
        const stageOrder: Record<string, number> = {
          introduction: 0,
          practice: 1,
          mastery: 2,
        };
        if (
          (stageOrder[lr.stage as string] ?? 0) >=
          (stageOrder[entry.latest_stage] ?? 0)
        ) {
          entry.latest_stage = lr.stage as string;
          entry.latest_stage_date = lr.presentation_date as string;
        }
      }
    }

    const student_introductions = Array.from(
      byStudent.values(),
    ) as MaterialStudentIntroduction[];

    return success({
      item: item as MaterialInventoryItemWithDetails,
      student_introductions,
    });
  } catch (err) {
    console.error("[materials:get]", err);
    return failure("Failed to load inventory item");
  }
}

// ============================================================
// Create inventory item
// ============================================================

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<ActionResponse<MaterialInventoryItem>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = CreateInventoryItemSchema.parse(input);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("material_inventory_items")
      .insert({
        tenant_id: ctx.tenant.id,
        material_id: parsed.material_id,
        location_id: parsed.location_id || null,
        condition: parsed.condition ?? "good",
        status: parsed.status ?? "available",
        quantity: parsed.quantity ?? 1,
        shelf_position: parsed.shelf_position || null,
        date_acquired: parsed.date_acquired || null,
        last_inspected_at: parsed.last_inspected_at || null,
        serial_number: parsed.serial_number || null,
        photo_url: parsed.photo_url || null,
        notes: parsed.notes || null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[materials:create]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_INVENTORY_ITEM_CREATED,
        entityType: "material_inventory_item",
        entityId: null,
        metadata: {
          material_id: parsed.material_id,
          condition: parsed.condition ?? "good",
          status: parsed.status ?? "available",
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_INVENTORY_ITEM_CREATED,
      entityType: "material_inventory_item",
      entityId: data.id,
      metadata: {
        material_id: parsed.material_id,
        condition: parsed.condition ?? "good",
        status: parsed.status ?? "available",
      },
    });

    return success(data as MaterialInventoryItem);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:create]", err);
    return failure("Failed to create inventory item");
  }
}

// ============================================================
// Update inventory item
// ============================================================

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
): Promise<ActionResponse<MaterialInventoryItem>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = UpdateInventoryItemSchema.parse(input);
    const db = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (parsed.location_id !== undefined)
      updates.location_id = parsed.location_id || null;
    if (parsed.condition !== undefined) updates.condition = parsed.condition;
    if (parsed.status !== undefined) updates.status = parsed.status;
    if (parsed.quantity !== undefined) updates.quantity = parsed.quantity;
    if (parsed.shelf_position !== undefined)
      updates.shelf_position = parsed.shelf_position || null;
    if (parsed.date_acquired !== undefined)
      updates.date_acquired = parsed.date_acquired || null;
    if (parsed.last_inspected_at !== undefined)
      updates.last_inspected_at = parsed.last_inspected_at || null;
    if (parsed.serial_number !== undefined)
      updates.serial_number = parsed.serial_number || null;
    if (parsed.photo_url !== undefined)
      updates.photo_url = parsed.photo_url || null;
    if (parsed.notes !== undefined) updates.notes = parsed.notes || null;

    const { data, error } = await db
      .from("material_inventory_items")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[materials:update]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_INVENTORY_ITEM_UPDATED,
        entityType: "material_inventory_item",
        entityId: id,
        metadata: { ...updates, failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_INVENTORY_ITEM_UPDATED,
      entityType: "material_inventory_item",
      entityId: id,
      metadata: updates,
    });

    return success(data as MaterialInventoryItem);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:update]", err);
    return failure("Failed to update inventory item");
  }
}

// ============================================================
// Delete (soft) inventory item
// ============================================================

export async function deleteInventoryItem(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("material_inventory_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (error) {
      console.error("[materials:delete]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_INVENTORY_ITEM_DELETED,
        entityType: "material_inventory_item",
        entityId: id,
        metadata: { failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_INVENTORY_ITEM_DELETED,
      entityType: "material_inventory_item",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    console.error("[materials:delete]", err);
    return failure("Failed to delete inventory item");
  }
}

// ============================================================
// Update condition (quick action)
// ============================================================

export async function updateItemCondition(
  id: string,
  input: UpdateItemConditionInput,
): Promise<ActionResponse<MaterialInventoryItem>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = UpdateItemConditionSchema.parse(input);
    const db = await createSupabaseServerClient();

    const updates: Record<string, unknown> = { condition: parsed.condition };
    if (parsed.notes) {
      // Append note to existing notes
      const { data: existing } = await db
        .from("material_inventory_items")
        .select("notes")
        .eq("id", id)
        .single();
      const prev = (existing?.notes as string | null) ?? "";
      const timestamp = new Date().toLocaleDateString("en-AU");
      updates.notes = prev
        ? `${prev}\n[${timestamp}] ${parsed.notes}`
        : `[${timestamp}] ${parsed.notes}`;
    }

    const { data, error } = await db
      .from("material_inventory_items")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[materials:condition]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_INVENTORY_CONDITION_UPDATED,
        entityType: "material_inventory_item",
        entityId: id,
        metadata: {
          condition: parsed.condition,
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_INVENTORY_CONDITION_UPDATED,
      entityType: "material_inventory_item",
      entityId: id,
      metadata: { condition: parsed.condition },
    });

    return success(data as MaterialInventoryItem);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:condition]", err);
    return failure("Failed to update condition");
  }
}

// ============================================================
// Update status (quick action)
// ============================================================

export async function updateItemStatus(
  id: string,
  input: UpdateItemStatusInput,
): Promise<ActionResponse<MaterialInventoryItem>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = UpdateItemStatusSchema.parse(input);
    const db = await createSupabaseServerClient();

    const updates: Record<string, unknown> = { status: parsed.status };
    if (parsed.notes) {
      const { data: existing } = await db
        .from("material_inventory_items")
        .select("notes")
        .eq("id", id)
        .single();
      const prev = (existing?.notes as string | null) ?? "";
      const timestamp = new Date().toLocaleDateString("en-AU");
      updates.notes = prev
        ? `${prev}\n[${timestamp}] ${parsed.notes}`
        : `[${timestamp}] ${parsed.notes}`;
    }

    const { data, error } = await db
      .from("material_inventory_items")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    const action =
      parsed.status === "retired"
        ? AuditActions.MATERIAL_INVENTORY_ITEM_RETIRED
        : AuditActions.MATERIAL_INVENTORY_STATUS_UPDATED;

    if (error) {
      console.error("[materials:status]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action,
        entityType: "material_inventory_item",
        entityId: id,
        metadata: { status: parsed.status, failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action,
      entityType: "material_inventory_item",
      entityId: id,
      metadata: { status: parsed.status },
    });

    return success(data as MaterialInventoryItem);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:status]", err);
    return failure("Failed to update status");
  }
}

// ============================================================
// Record inspection
// ============================================================

export async function recordInspection(
  id: string,
  input: RecordInspectionInput,
): Promise<ActionResponse<MaterialInventoryItem>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = RecordInspectionSchema.parse(input);
    const db = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];
    const updates: Record<string, unknown> = {
      condition: parsed.condition,
      last_inspected_at: today,
    };

    if (parsed.notes) {
      const { data: existing } = await db
        .from("material_inventory_items")
        .select("notes")
        .eq("id", id)
        .single();
      const prev = (existing?.notes as string | null) ?? "";
      updates.notes = prev
        ? `${prev}\n[${today}] Inspection: ${parsed.notes}`
        : `[${today}] Inspection: ${parsed.notes}`;
    }

    const { data, error } = await db
      .from("material_inventory_items")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[materials:inspect]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_INVENTORY_CONDITION_UPDATED,
        entityType: "material_inventory_item",
        entityId: id,
        metadata: {
          condition: parsed.condition,
          inspected_on: today,
          failed: true,
          error: error.message,
        },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_INVENTORY_CONDITION_UPDATED,
      entityType: "material_inventory_item",
      entityId: id,
      metadata: { condition: parsed.condition, inspected_on: today },
    });

    return success(data as MaterialInventoryItem);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:inspect]", err);
    return failure("Failed to record inspection");
  }
}

// ============================================================
// Shelf locations - list
// ============================================================

export async function listShelfLocations(): Promise<
  ActionResponse<MaterialShelfLocation[]>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MATERIAL_INVENTORY);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("material_shelf_locations")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[materials:locations:list]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as MaterialShelfLocation[]);
  } catch (err) {
    console.error("[materials:locations:list]", err);
    return failure("Failed to load shelf locations");
  }
}

// ============================================================
// Shelf locations - create
// ============================================================

export async function createShelfLocation(
  input: CreateShelfLocationInput,
): Promise<ActionResponse<MaterialShelfLocation>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = CreateShelfLocationSchema.parse(input);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("material_shelf_locations")
      .insert({
        tenant_id: ctx.tenant.id,
        name: parsed.name,
        description: parsed.description || null,
        room_type: parsed.room_type || null,
        sort_order: parsed.sort_order ?? 0,
        is_active: parsed.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure("A shelf location with this name already exists");
      }
      console.error("[materials:locations:create]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_SHELF_LOCATION_CREATED,
        entityType: "material_shelf_location",
        entityId: null,
        metadata: { name: parsed.name, failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_SHELF_LOCATION_CREATED,
      entityType: "material_shelf_location",
      entityId: data.id,
      metadata: { name: parsed.name },
    });

    return success(data as MaterialShelfLocation);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:locations:create]", err);
    return failure("Failed to create shelf location");
  }
}

// ============================================================
// Shelf locations - update
// ============================================================

export async function updateShelfLocation(
  id: string,
  input: UpdateShelfLocationInput,
): Promise<ActionResponse<MaterialShelfLocation>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const parsed = UpdateShelfLocationSchema.parse(input);
    const db = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.description !== undefined)
      updates.description = parsed.description || null;
    if (parsed.room_type !== undefined)
      updates.room_type = parsed.room_type || null;
    if (parsed.sort_order !== undefined) updates.sort_order = parsed.sort_order;
    if (parsed.is_active !== undefined) updates.is_active = parsed.is_active;

    const { data, error } = await db
      .from("material_shelf_locations")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("[materials:locations:update]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_SHELF_LOCATION_UPDATED,
        entityType: "material_shelf_location",
        entityId: id,
        metadata: { ...updates, failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_SHELF_LOCATION_UPDATED,
      entityType: "material_shelf_location",
      entityId: id,
      metadata: updates,
    });

    return success(data as MaterialShelfLocation);
  } catch (err) {
    if (err instanceof ZodError)
      return failure("Validation error", "VALIDATION_ERROR");
    console.error("[materials:locations:update]", err);
    return failure("Failed to update shelf location");
  }
}

// ============================================================
// Shelf locations - delete (soft)
// ============================================================

export async function deleteShelfLocation(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const db = await createSupabaseServerClient();

    // Null out location_id on items pointing here before soft-delete
    await db
      .from("material_inventory_items")
      .update({ location_id: null })
      .eq("location_id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    const { error } = await db
      .from("material_shelf_locations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null);

    if (error) {
      console.error("[materials:locations:delete]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        id,
        error,
      });
      await logAudit({
        context: ctx,
        action: AuditActions.MATERIAL_SHELF_LOCATION_DELETED,
        entityType: "material_shelf_location",
        entityId: id,
        metadata: { failed: true, error: error.message },
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_SHELF_LOCATION_DELETED,
      entityType: "material_shelf_location",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    console.error("[materials:locations:delete]", err);
    return failure("Failed to delete shelf location");
  }
}

// ============================================================
// Export inventory as CSV
// ============================================================

export async function exportInventory(): Promise<
  ActionResponse<{ csv: string; filename: string }>
> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MATERIAL_INVENTORY);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("material_inventory_items")
      .select(
        `
        *,
        material:montessori_materials!material_id(name, area, age_level),
        location:material_shelf_locations!location_id(name)
        `,
      )
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[materials:export]", {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        error,
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const header = [
      "Material Name",
      "Area",
      "Age Level",
      "Location",
      "Shelf Position",
      "Condition",
      "Status",
      "Quantity",
      "Date Acquired",
      "Last Inspected",
      "Serial Number",
      "Notes",
    ].join(",");

    const rows = (data ?? []).map((item) => {
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        esc((item.material as { name: string } | null)?.name),
        esc(
          (item.material as { area: string } | null)?.area?.replace(/_/g, " "),
        ),
        esc((item.material as { age_level: string } | null)?.age_level),
        esc((item.location as { name: string } | null)?.name),
        esc(item.shelf_position),
        esc(item.condition),
        esc(item.status),
        esc(item.quantity),
        esc(item.date_acquired),
        esc(item.last_inspected_at),
        esc(item.serial_number),
        esc(item.notes),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const date = new Date().toISOString().split("T")[0];
    const filename = `material-inventory-${date}.csv`;

    await logAudit({
      context: ctx,
      action: AuditActions.MATERIAL_INVENTORY_EXPORTED,
      entityType: "material_inventory",
      entityId: ctx.tenant.id,
      metadata: { row_count: rows.length },
    });

    return success({ csv, filename });
  } catch (err) {
    console.error("[materials:export]", err);
    return failure("Failed to export inventory");
  }
}
