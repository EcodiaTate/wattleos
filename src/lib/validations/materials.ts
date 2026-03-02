// src/lib/validations/materials.ts
//
// ============================================================
// Material / Shelf Inventory - Zod Schemas
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Shared enums
// ────────────────────────────────────────────────────────────

const ConditionEnum = z.enum(["excellent", "good", "fair", "damaged"]);
const StatusEnum = z.enum([
  "available",
  "in_use",
  "being_repaired",
  "on_order",
  "retired",
]);
const RoomTypeEnum = z.enum([
  "practical_life",
  "sensorial",
  "language",
  "mathematics",
  "cultural",
  "other",
]);

// ────────────────────────────────────────────────────────────
// Shelf Location
// ────────────────────────────────────────────────────────────

export const CreateShelfLocationSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  room_type: RoomTypeEnum.nullish(),
  sort_order: z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
});

export const UpdateShelfLocationSchema = CreateShelfLocationSchema.partial();

export type CreateShelfLocationInput = z.infer<
  typeof CreateShelfLocationSchema
>;
export type UpdateShelfLocationInput = z.infer<
  typeof UpdateShelfLocationSchema
>;

// ────────────────────────────────────────────────────────────
// Inventory Item
// ────────────────────────────────────────────────────────────

export const CreateInventoryItemSchema = z.object({
  material_id: z.string().uuid("material_id must be a valid UUID"),
  location_id: z.string().uuid().nullish(),
  condition: ConditionEnum.optional(),
  status: StatusEnum.optional(),
  quantity: z.number().int().min(1).max(9999).optional(),
  shelf_position: z.string().max(200).nullish(),
  date_acquired: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  last_inspected_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  serial_number: z.string().max(100).nullish(),
  photo_url: z.string().url().nullish(),
  notes: z.string().max(2000).nullish(),
});

export const UpdateInventoryItemSchema =
  CreateInventoryItemSchema.partial().omit({
    material_id: true, // material cannot be changed after creation
  });

export type CreateInventoryItemInput = z.infer<
  typeof CreateInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof UpdateInventoryItemSchema
>;

// ────────────────────────────────────────────────────────────
// Quick status / condition updates
// ────────────────────────────────────────────────────────────

export const UpdateItemConditionSchema = z.object({
  condition: ConditionEnum,
  notes: z.string().max(2000).nullish(),
});

export const UpdateItemStatusSchema = z.object({
  status: StatusEnum,
  notes: z.string().max(2000).nullish(),
});

export type UpdateItemConditionInput = z.infer<
  typeof UpdateItemConditionSchema
>;
export type UpdateItemStatusInput = z.infer<typeof UpdateItemStatusSchema>;

// ────────────────────────────────────────────────────────────
// Record inspection
// ────────────────────────────────────────────────────────────

export const RecordInspectionSchema = z.object({
  condition: ConditionEnum,
  notes: z.string().max(2000).nullish(),
});

export type RecordInspectionInput = z.infer<typeof RecordInspectionSchema>;

// ────────────────────────────────────────────────────────────
// List / filter
// ────────────────────────────────────────────────────────────

export const ListInventoryItemsSchema = z.object({
  area: z
    .enum([
      "practical_life",
      "sensorial",
      "language",
      "mathematics",
      "cultural",
    ])
    .nullish(),
  location_id: z.string().uuid().nullish(),
  condition: ConditionEnum.nullish(),
  status: StatusEnum.nullish(),
  age_level: z.enum(["0_3", "3_6", "6_9", "9_12"]).nullish(),
  search: z.string().max(200).nullish(),
  needs_attention_only: z.boolean().optional(),
  inspection_overdue_only: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
});

export type ListInventoryItemsInput = z.infer<typeof ListInventoryItemsSchema>;
