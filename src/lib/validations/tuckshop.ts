// src/lib/validations/tuckshop.ts
//
// ============================================================
// WattleOS V2 - Tuckshop Ordering System Validations
// ============================================================

import { z } from "zod";

// ============================================================
// Enums
// ============================================================

export const tuckshopMenuCategoryEnum = z.enum([
  "hot_food",
  "cold_food",
  "snack",
  "drink",
  "dessert",
  "other",
]);

export const tuckshopDayOfWeekEnum = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]);

export const tuckshopOrderStatusEnum = z.enum([
  "draft",
  "submitted",
  "ready",
  "collected",
  "cancelled",
]);

export const tuckshopDeliveryStatusEnum = z.enum([
  "open",
  "ordered",
  "received",
  "finalized",
]);

// ============================================================
// Suppliers
// ============================================================

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contact_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  contact_email: z
    .string()
    .trim()
    .email("Invalid email")
    .max(320)
    .nullish()
    .transform((v) => v || null),
  contact_phone: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  delivery_days: z.array(tuckshopDayOfWeekEnum).default([]),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ============================================================
// Menu Items
// ============================================================

export const createMenuItemSchema = z.object({
  supplier_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  category: tuckshopMenuCategoryEnum,
  price_cents: z
    .number()
    .int("Price must be a whole number of cents")
    .min(0, "Price cannot be negative"),
  available_days: z.array(tuckshopDayOfWeekEnum).default([]),
  image_url: z
    .string()
    .url("Invalid image URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial();
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

// ============================================================
// Delivery Weeks
// ============================================================

export const createDeliveryWeekSchema = z.object({
  supplier_id: z.string().uuid("Invalid supplier ID"),
  week_start: z.string().date("Week start must be YYYY-MM-DD"),
  week_end: z.string().date("Week end must be YYYY-MM-DD"),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateDeliveryWeekInput = z.infer<typeof createDeliveryWeekSchema>;

export const updateDeliveryWeekStatusSchema = z.object({
  status: tuckshopDeliveryStatusEnum,
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateDeliveryWeekStatusInput = z.infer<
  typeof updateDeliveryWeekStatusSchema
>;

// ============================================================
// Orders
// ============================================================

export const orderItemInputSchema = z.object({
  menu_item_id: z.string().uuid("Invalid menu item ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(20),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const createOrderSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  delivery_week_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  order_date: z.string().date("Order date must be YYYY-MM-DD"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "At least one item is required")
    .max(50),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderItemsSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, "At least one item is required")
    .max(50),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsSchema>;

export const cancelOrderSchema = z.object({
  cancellation_reason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

// ============================================================
// Filters
// ============================================================

export const listOrdersFilterSchema = z.object({
  status: tuckshopOrderStatusEnum.nullish(),
  delivery_week_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  order_date: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListOrdersFilter = z.infer<typeof listOrdersFilterSchema>;

export const listMenuItemsFilterSchema = z.object({
  category: tuckshopMenuCategoryEnum.nullish(),
  day: tuckshopDayOfWeekEnum.nullish(),
  supplier_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  include_inactive: z.boolean().default(false),
});

export type ListMenuItemsFilter = z.infer<typeof listMenuItemsFilterSchema>;
