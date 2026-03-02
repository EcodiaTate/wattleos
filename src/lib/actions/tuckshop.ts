"use server";

// src/lib/actions/tuckshop.ts
//
// ============================================================
// WattleOS V2 - Tuckshop Ordering System Server Actions
// ============================================================
// Covers:
//   Suppliers   - CRUD for vendor records
//   Menu Items  - CRUD for menu, price, available days
//   Delivery Weeks - weekly order cycles, status transitions
//   Orders      - place/submit/collect/cancel per student
//
// Permissions:
//   MANAGE_TUCKSHOP      - admin CRUD on suppliers, menu, delivery, orders
//   PLACE_TUCKSHOP_ORDER - parent/staff place orders for their student
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type ActionResponse,
  type PaginatedResponse,
  ErrorCodes,
  failure,
  success,
  paginated,
  paginatedFailure,
} from "@/types/api";
import type {
  TuckshopSupplier,
  TuckshopMenuItem,
  TuckshopMenuItemWithSupplier,
  TuckshopDeliveryWeek,
  TuckshopDeliveryWeekWithDetails,
  TuckshopOrder,
  TuckshopOrderWithDetails,
  TuckshopDashboardData,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createSupplierSchema,
  type CreateSupplierInput,
  updateSupplierSchema,
  type UpdateSupplierInput,
  createMenuItemSchema,
  type CreateMenuItemInput,
  updateMenuItemSchema,
  type UpdateMenuItemInput,
  createDeliveryWeekSchema,
  type CreateDeliveryWeekInput,
  updateDeliveryWeekStatusSchema,
  type UpdateDeliveryWeekStatusInput,
  createOrderSchema,
  type CreateOrderInput,
  cancelOrderSchema,
  type CancelOrderInput,
  listOrdersFilterSchema,
  type ListOrdersFilter,
  listMenuItemsFilterSchema,
  type ListMenuItemsFilter,
} from "@/lib/validations/tuckshop";

// ============================================================
// SUPPLIERS
// ============================================================

export async function listSuppliers(): Promise<
  ActionResponse<TuckshopSupplier[]>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tuckshop_suppliers")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("name");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as TuckshopSupplier[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getSupplier(
  supplierId: string,
): Promise<ActionResponse<TuckshopSupplier>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tuckshop_suppliers")
      .select("*")
      .eq("id", supplierId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (error || !data)
      return failure("Supplier not found", ErrorCodes.NOT_FOUND);
    return success(data as TuckshopSupplier);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<ActionResponse<TuckshopSupplier>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = createSupplierSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("tuckshop_suppliers")
      .insert({ tenant_id: context.tenant.id, ...parsed.data })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_SUPPLIER_CREATED,
      entityType: "tuckshop_supplier",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    return success(data as TuckshopSupplier);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateSupplier(
  supplierId: string,
  input: UpdateSupplierInput,
): Promise<ActionResponse<TuckshopSupplier>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateSupplierSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("tuckshop_suppliers")
      .update(parsed.data)
      .eq("id", supplierId)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data)
      return failure("Supplier not found", ErrorCodes.NOT_FOUND);

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_SUPPLIER_UPDATED,
      entityType: "tuckshop_supplier",
      entityId: supplierId,
      metadata: parsed.data,
    });

    return success(data as TuckshopSupplier);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteSupplier(
  supplierId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("tuckshop_suppliers")
      .select("id, name")
      .eq("id", supplierId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) return failure("Supplier not found", ErrorCodes.NOT_FOUND);

    const { error } = await supabase
      .from("tuckshop_suppliers")
      .delete()
      .eq("id", supplierId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_SUPPLIER_DELETED,
      entityType: "tuckshop_supplier",
      entityId: supplierId,
      metadata: { name: existing.name },
    });

    return success(undefined as unknown as void);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// MENU ITEMS
// ============================================================

export async function listMenuItems(
  filterInput: ListMenuItemsFilter,
): Promise<ActionResponse<TuckshopMenuItemWithSupplier[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = listMenuItemsFilterSchema.safeParse(filterInput);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );

    const filter = parsed.data;

    let query = supabase
      .from("tuckshop_menu_items")
      .select("*, tuckshop_suppliers(id, name)")
      .eq("tenant_id", context.tenant.id);

    if (!filter.include_inactive) {
      query = query.eq("is_active", true);
    }
    if (filter.category) {
      query = query.eq("category", filter.category);
    }
    if (filter.supplier_id) {
      query = query.eq("supplier_id", filter.supplier_id);
    }
    if (filter.day) {
      query = query.contains("available_days", [filter.day]);
    }

    const { data, error } = await query.order("sort_order").order("name");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const items: TuckshopMenuItemWithSupplier[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { tuckshop_suppliers, ...rest } = row as Record<
          string,
          unknown
        > & {
          tuckshop_suppliers: Record<string, unknown> | null;
        };
        return {
          ...rest,
          supplier: tuckshop_suppliers || null,
        } as unknown as TuckshopMenuItemWithSupplier;
      },
    );

    return success(items);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listMenuItemsPublic(
  day?: string,
): Promise<ActionResponse<TuckshopMenuItemWithSupplier[]>> {
  // No MANAGE_TUCKSHOP needed - parents need to browse the menu
  try {
    const context = await requirePermission(Permissions.PLACE_TUCKSHOP_ORDER);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("tuckshop_menu_items")
      .select("*, tuckshop_suppliers(id, name)")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true);

    if (day) {
      query = query.contains("available_days", [day]);
    }

    const { data, error } = await query.order("sort_order").order("name");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const items: TuckshopMenuItemWithSupplier[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { tuckshop_suppliers, ...rest } = row as Record<
          string,
          unknown
        > & {
          tuckshop_suppliers: Record<string, unknown> | null;
        };
        return {
          ...rest,
          supplier: tuckshop_suppliers || null,
        } as unknown as TuckshopMenuItemWithSupplier;
      },
    );

    return success(items);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createMenuItem(
  input: CreateMenuItemInput,
): Promise<ActionResponse<TuckshopMenuItem>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = createMenuItemSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("tuckshop_menu_items")
      .insert({ tenant_id: context.tenant.id, ...parsed.data })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_MENU_ITEM_CREATED,
      entityType: "tuckshop_menu_item",
      entityId: data.id,
      metadata: {
        name: parsed.data.name,
        price_cents: parsed.data.price_cents,
      },
    });

    return success(data as TuckshopMenuItem);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateMenuItem(
  menuItemId: string,
  input: UpdateMenuItemInput,
): Promise<ActionResponse<TuckshopMenuItem>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateMenuItemSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("tuckshop_menu_items")
      .update(parsed.data)
      .eq("id", menuItemId)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data)
      return failure("Menu item not found", ErrorCodes.NOT_FOUND);

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_MENU_ITEM_UPDATED,
      entityType: "tuckshop_menu_item",
      entityId: menuItemId,
      metadata: parsed.data,
    });

    return success(data as TuckshopMenuItem);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteMenuItem(
  menuItemId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("tuckshop_menu_items")
      .select("id, name")
      .eq("id", menuItemId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) return failure("Menu item not found", ErrorCodes.NOT_FOUND);

    // Soft-delete: set is_active = false (keeps order history intact)
    const { error } = await supabase
      .from("tuckshop_menu_items")
      .update({ is_active: false })
      .eq("id", menuItemId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_MENU_ITEM_DELETED,
      entityType: "tuckshop_menu_item",
      entityId: menuItemId,
      metadata: { name: existing.name },
    });

    return success(undefined as unknown as void);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DELIVERY WEEKS
// ============================================================

export async function listDeliveryWeeks(opts?: {
  supplier_id?: string;
  status?: string;
}): Promise<ActionResponse<TuckshopDeliveryWeekWithDetails[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("tuckshop_delivery_weeks")
      .select("*, tuckshop_suppliers(id, name)")
      .eq("tenant_id", context.tenant.id);

    if (opts?.supplier_id) query = query.eq("supplier_id", opts.supplier_id);
    if (opts?.status) query = query.eq("status", opts.status);

    const { data, error } = await query.order("week_start", {
      ascending: false,
    });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    // Attach order summaries
    const weekIds = (data ?? []).map(
      (w: Record<string, unknown>) => w.id as string,
    );

    let orderSummaries: Record<
      string,
      { order_count: number; total_revenue_cents: number }
    > = {};

    if (weekIds.length > 0) {
      const { data: orders } = await supabase
        .from("tuckshop_orders")
        .select("delivery_week_id, total_price_cents, status")
        .eq("tenant_id", context.tenant.id)
        .in("delivery_week_id", weekIds)
        .not("status", "eq", "cancelled");

      for (const order of orders ?? []) {
        const wid = order.delivery_week_id as string;
        if (!orderSummaries[wid]) {
          orderSummaries[wid] = { order_count: 0, total_revenue_cents: 0 };
        }
        orderSummaries[wid].order_count++;
        orderSummaries[wid].total_revenue_cents += order.total_price_cents ?? 0;
      }
    }

    const weeks: TuckshopDeliveryWeekWithDetails[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { tuckshop_suppliers, ...rest } = row as Record<
          string,
          unknown
        > & {
          tuckshop_suppliers: Record<string, unknown>;
        };
        const summary = orderSummaries[rest.id as string] ?? {
          order_count: 0,
          total_revenue_cents: 0,
        };
        return {
          ...rest,
          supplier: tuckshop_suppliers,
          ...summary,
          item_summary: [],
        } as unknown as TuckshopDeliveryWeekWithDetails;
      },
    );

    return success(weeks);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createDeliveryWeek(
  input: CreateDeliveryWeekInput,
): Promise<ActionResponse<TuckshopDeliveryWeek>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = createDeliveryWeekSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("tuckshop_delivery_weeks")
      .insert({ tenant_id: context.tenant.id, ...parsed.data })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    return success(data as TuckshopDeliveryWeek);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function advanceDeliveryWeekStatus(
  weekId: string,
  input: UpdateDeliveryWeekStatusInput,
): Promise<ActionResponse<TuckshopDeliveryWeek>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateDeliveryWeekStatusSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const updates: Record<string, unknown> = {
      status: parsed.data.status,
    };
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

    if (parsed.data.status === "ordered") {
      updates.ordered_at = new Date().toISOString();
      updates.ordered_by = context.user.id;
    } else if (parsed.data.status === "received") {
      updates.received_at = new Date().toISOString();
    } else if (parsed.data.status === "finalized") {
      updates.finalized_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tuckshop_delivery_weeks")
      .update(updates)
      .eq("id", weekId)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data)
      return failure("Delivery week not found", ErrorCodes.NOT_FOUND);

    const auditAction =
      parsed.data.status === "ordered"
        ? AuditActions.TUCKSHOP_DELIVERY_ORDERED
        : parsed.data.status === "received"
          ? AuditActions.TUCKSHOP_DELIVERY_RECEIVED
          : AuditActions.TUCKSHOP_DELIVERY_FINALIZED;

    logAudit({
      context,
      action: auditAction,
      entityType: "tuckshop_delivery_week",
      entityId: weekId,
      metadata: { status: parsed.data.status },
    });

    return success(data as TuckshopDeliveryWeek);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function exportDeliveryWeekOrders(weekId: string): Promise<
  ActionResponse<{
    week: TuckshopDeliveryWeek;
    rows: {
      student_name: string;
      item_name: string;
      category: string;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    }[];
    totals: {
      item_name: string;
      total_quantity: number;
      total_cents: number;
    }[];
  }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    // Verify week belongs to tenant
    const { data: week, error: weekErr } = await supabase
      .from("tuckshop_delivery_weeks")
      .select("*")
      .eq("id", weekId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (weekErr || !week)
      return failure("Delivery week not found", ErrorCodes.NOT_FOUND);

    // Get all submitted/ready orders for this week with items
    const { data: orders, error: ordersErr } = await supabase
      .from("tuckshop_orders")
      .select(
        "id, total_price_cents, students!inner(first_name, last_name), tuckshop_order_items!inner(quantity, unit_price_cents, tuckshop_menu_items!inner(name, category))",
      )
      .eq("delivery_week_id", weekId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["submitted", "ready", "collected"]);

    if (ordersErr) return failure(ordersErr.message, ErrorCodes.DATABASE_ERROR);

    // Flatten into CSV rows
    const rows: {
      student_name: string;
      item_name: string;
      category: string;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    }[] = [];

    const itemTotals: Record<
      string,
      { item_name: string; total_quantity: number; total_cents: number }
    > = {};

    for (const order of orders ?? []) {
      const o = order as Record<string, unknown>;
      const student = o.students as Record<string, unknown>;
      const studentName = `${student.first_name} ${student.last_name}`;
      const items = o.tuckshop_order_items as Record<string, unknown>[];

      for (const item of items ?? []) {
        const menuItem = item.tuckshop_menu_items as Record<string, unknown>;
        const qty = item.quantity as number;
        const unitPrice = item.unit_price_cents as number;
        const name = menuItem.name as string;

        rows.push({
          student_name: studentName,
          item_name: name,
          category: menuItem.category as string,
          quantity: qty,
          unit_price_cents: unitPrice,
          line_total_cents: qty * unitPrice,
        });

        if (!itemTotals[name]) {
          itemTotals[name] = {
            item_name: name,
            total_quantity: 0,
            total_cents: 0,
          };
        }
        itemTotals[name].total_quantity += qty;
        itemTotals[name].total_cents += qty * unitPrice;
      }
    }

    return success({
      week: week as TuckshopDeliveryWeek,
      rows: rows.sort((a, b) => a.student_name.localeCompare(b.student_name)),
      totals: Object.values(itemTotals).sort((a, b) =>
        a.item_name.localeCompare(b.item_name),
      ),
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ORDERS
// ============================================================

export async function getTuckshopDashboard(): Promise<
  ActionResponse<TuckshopDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Open delivery weeks
    const { data: openWeeks } = await supabase
      .from("tuckshop_delivery_weeks")
      .select("*, tuckshop_suppliers(id, name)")
      .eq("tenant_id", tenantId)
      .in("status", ["open", "ordered"])
      .order("week_start");

    // Orders this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const { data: weekOrders } = await supabase
      .from("tuckshop_orders")
      .select("status, total_price_cents")
      .eq("tenant_id", tenantId)
      .gte("order_date", weekStartStr)
      .not("status", "eq", "cancelled");

    let submittedCount = 0;
    let readyCount = 0;
    let revenueThisWeek = 0;

    for (const o of weekOrders ?? []) {
      if (o.status === "submitted") submittedCount++;
      if (o.status === "ready") readyCount++;
      revenueThisWeek += o.total_price_cents ?? 0;
    }

    // Pending orders (submitted, not yet ready) with student info
    const { data: pendingRaw } = await supabase
      .from("tuckshop_orders")
      .select(
        "*, students!inner(id, first_name, last_name), tuckshop_order_items!inner(*, tuckshop_menu_items!inner(id, name, category, image_url))",
      )
      .eq("tenant_id", tenantId)
      .in("status", ["submitted", "ready"])
      .order("order_date");

    const pendingOrders: TuckshopOrderWithDetails[] = (pendingRaw ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, tuckshop_order_items, ...rest } = row as Record<
          string,
          unknown
        > & {
          students: Record<string, unknown>;
          tuckshop_order_items: Record<string, unknown>[];
        };
        const items = (tuckshop_order_items ?? []).map(
          (item: Record<string, unknown>) => {
            const { tuckshop_menu_items, ...itemRest } = item as Record<
              string,
              unknown
            > & { tuckshop_menu_items: Record<string, unknown> };
            return { ...itemRest, menu_item: tuckshop_menu_items };
          },
        );
        return {
          ...rest,
          student: students,
          items,
        } as unknown as TuckshopOrderWithDetails;
      },
    );

    // Active suppliers
    const { data: suppliers } = await supabase
      .from("tuckshop_suppliers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    // Build delivery week details
    const weekIds = (openWeeks ?? []).map(
      (w: Record<string, unknown>) => w.id as string,
    );
    let orderSummaries: Record<
      string,
      { order_count: number; total_revenue_cents: number }
    > = {};

    if (weekIds.length > 0) {
      const { data: wOrders } = await supabase
        .from("tuckshop_orders")
        .select("delivery_week_id, total_price_cents")
        .eq("tenant_id", tenantId)
        .in("delivery_week_id", weekIds)
        .not("status", "eq", "cancelled");

      for (const o of wOrders ?? []) {
        const wid = o.delivery_week_id as string;
        if (!orderSummaries[wid]) {
          orderSummaries[wid] = { order_count: 0, total_revenue_cents: 0 };
        }
        orderSummaries[wid].order_count++;
        orderSummaries[wid].total_revenue_cents += o.total_price_cents ?? 0;
      }
    }

    const activeDeliveryWeeks: TuckshopDeliveryWeekWithDetails[] = (
      openWeeks ?? []
    ).map((row: Record<string, unknown>) => {
      const { tuckshop_suppliers, ...rest } = row as Record<string, unknown> & {
        tuckshop_suppliers: Record<string, unknown>;
      };
      const summary = orderSummaries[rest.id as string] ?? {
        order_count: 0,
        total_revenue_cents: 0,
      };
      return {
        ...rest,
        supplier: tuckshop_suppliers,
        ...summary,
        item_summary: [],
      } as unknown as TuckshopDeliveryWeekWithDetails;
    });

    return success({
      stats: {
        open_delivery_weeks: (openWeeks ?? []).length,
        submitted_orders_this_week: submittedCount,
        ready_for_collection: readyCount,
        total_revenue_this_week_cents: revenueThisWeek,
      },
      active_delivery_weeks: activeDeliveryWeeks,
      pending_orders: pendingOrders,
      active_suppliers: (suppliers ?? []) as TuckshopSupplier[],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listOrders(
  filterInput: ListOrdersFilter,
): Promise<PaginatedResponse<TuckshopOrderWithDetails>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const parsed = listOrdersFilterSchema.safeParse(filterInput);
    if (!parsed.success)
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );

    const filter = parsed.data;

    let query = supabase
      .from("tuckshop_orders")
      .select(
        "*, students!inner(id, first_name, last_name), tuckshop_order_items!inner(*, tuckshop_menu_items!inner(id, name, category, image_url))",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id);

    if (filter.status) query = query.eq("status", filter.status);
    if (filter.delivery_week_id)
      query = query.eq("delivery_week_id", filter.delivery_week_id);
    if (filter.student_id) query = query.eq("student_id", filter.student_id);
    if (filter.order_date) query = query.eq("order_date", filter.order_date);
    if (filter.search) {
      query = query.or(
        `first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%`,
        { referencedTable: "students" },
      );
    }

    const from = (filter.page - 1) * filter.per_page;
    const to = from + filter.per_page - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    const orders: TuckshopOrderWithDetails[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, tuckshop_order_items, ...rest } = row as Record<
          string,
          unknown
        > & {
          students: Record<string, unknown>;
          tuckshop_order_items: Record<string, unknown>[];
        };
        const items = (tuckshop_order_items ?? []).map(
          (item: Record<string, unknown>) => {
            const { tuckshop_menu_items, ...itemRest } = item as Record<
              string,
              unknown
            > & { tuckshop_menu_items: Record<string, unknown> };
            return { ...itemRest, menu_item: tuckshop_menu_items };
          },
        );
        return {
          ...rest,
          student: students,
          items,
        } as unknown as TuckshopOrderWithDetails;
      },
    );

    return paginated(orders, count ?? 0, filter.page, filter.per_page);
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getStudentOrders(
  studentId: string,
): Promise<ActionResponse<TuckshopOrderWithDetails[]>> {
  try {
    const context = await requirePermission(Permissions.PLACE_TUCKSHOP_ORDER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tuckshop_orders")
      .select(
        "*, students!inner(id, first_name, last_name), tuckshop_order_items!inner(*, tuckshop_menu_items!inner(id, name, category, image_url))",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .order("order_date", { ascending: false })
      .limit(50);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const orders: TuckshopOrderWithDetails[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, tuckshop_order_items, ...rest } = row as Record<
          string,
          unknown
        > & {
          students: Record<string, unknown>;
          tuckshop_order_items: Record<string, unknown>[];
        };
        const items = (tuckshop_order_items ?? []).map(
          (item: Record<string, unknown>) => {
            const { tuckshop_menu_items, ...itemRest } = item as Record<
              string,
              unknown
            > & { tuckshop_menu_items: Record<string, unknown> };
            return { ...itemRest, menu_item: tuckshop_menu_items };
          },
        );
        return {
          ...rest,
          student: students,
          items,
        } as unknown as TuckshopOrderWithDetails;
      },
    );

    return success(orders);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function placeOrder(
  input: CreateOrderInput,
): Promise<ActionResponse<TuckshopOrder>> {
  try {
    const context = await requirePermission(Permissions.PLACE_TUCKSHOP_ORDER);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const orderData = parsed.data;

    // Fetch menu item prices and validate they exist + are active
    const menuItemIds = orderData.items.map((i) => i.menu_item_id);
    const { data: menuItems, error: menuErr } = await supabase
      .from("tuckshop_menu_items")
      .select("id, price_cents, is_active, name")
      .eq("tenant_id", tenantId)
      .in("id", menuItemIds);

    if (menuErr) return failure(menuErr.message, ErrorCodes.DATABASE_ERROR);

    const menuMap = new Map(
      (menuItems ?? []).map((m: Record<string, unknown>) => [m.id, m]),
    );

    // Validate all items exist and are active
    for (const item of orderData.items) {
      const menuItem = menuMap.get(item.menu_item_id);
      if (!menuItem)
        return failure(
          `Menu item not found: ${item.menu_item_id}`,
          ErrorCodes.NOT_FOUND,
        );
      if (!(menuItem as Record<string, unknown>).is_active)
        return failure(
          `Menu item "${(menuItem as Record<string, unknown>).name}" is no longer available`,
          ErrorCodes.VALIDATION_ERROR,
        );
    }

    // Calculate total
    const totalCents = orderData.items.reduce((sum, item) => {
      const menuItem = menuMap.get(item.menu_item_id) as
        | Record<string, unknown>
        | undefined;
      return sum + (menuItem?.price_cents as number) * item.quantity;
    }, 0);

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from("tuckshop_orders")
      .insert({
        tenant_id: tenantId,
        student_id: orderData.student_id,
        delivery_week_id: orderData.delivery_week_id,
        order_date: orderData.order_date,
        status: "submitted",
        total_price_cents: totalCents,
        placed_by_user_id: context.user.id,
        notes: orderData.notes,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr) return failure(orderErr.message, ErrorCodes.CREATE_FAILED);

    // Insert line items
    const lineItems = orderData.items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price_cents: (
        menuMap.get(item.menu_item_id) as Record<string, unknown>
      ).price_cents as number,
    }));

    const { error: itemsErr } = await supabase
      .from("tuckshop_order_items")
      .insert(lineItems);

    if (itemsErr) {
      // Rollback order
      await supabase.from("tuckshop_orders").delete().eq("id", order.id);
      return failure(itemsErr.message, ErrorCodes.CREATE_FAILED);
    }

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_ORDER_PLACED,
      entityType: "tuckshop_order",
      entityId: order.id,
      metadata: {
        student_id: orderData.student_id,
        total_cents: totalCents,
        item_count: orderData.items.length,
      },
    });

    return success(order as TuckshopOrder);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function markOrderReady(
  orderId: string,
): Promise<ActionResponse<TuckshopOrder>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tuckshop_orders")
      .update({ status: "ready" })
      .eq("id", orderId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "submitted")
      .select()
      .single();

    if (error || !data)
      return failure(
        "Order not found or not in submitted state",
        ErrorCodes.NOT_FOUND,
      );

    return success(data as TuckshopOrder);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function markOrderCollected(
  orderId: string,
): Promise<ActionResponse<TuckshopOrder>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TUCKSHOP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tuckshop_orders")
      .update({ status: "collected", collected_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["submitted", "ready"])
      .select()
      .single();

    if (error || !data)
      return failure(
        "Order not found or not in a collectible state",
        ErrorCodes.NOT_FOUND,
      );

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_ORDER_COLLECTED,
      entityType: "tuckshop_order",
      entityId: orderId,
      metadata: { student_id: data.student_id },
    });

    return success(data as TuckshopOrder);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function cancelOrder(
  orderId: string,
  input: CancelOrderInput,
): Promise<ActionResponse<TuckshopOrder>> {
  try {
    // Either the coordinator or the parent can cancel (before it's ready)
    const context = await requirePermission(Permissions.PLACE_TUCKSHOP_ORDER);
    const supabase = await createSupabaseServerClient();

    const parsed = cancelOrderSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("tuckshop_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: parsed.data.cancellation_reason,
      })
      .eq("id", orderId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["draft", "submitted"])
      .select()
      .single();

    if (error || !data)
      return failure(
        "Order not found or cannot be cancelled in its current state",
        ErrorCodes.NOT_FOUND,
      );

    logAudit({
      context,
      action: AuditActions.TUCKSHOP_ORDER_CANCELLED,
      entityType: "tuckshop_order",
      entityId: orderId,
      metadata: {
        student_id: data.student_id,
        reason: parsed.data.cancellation_reason,
      },
    });

    return success(data as TuckshopOrder);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
