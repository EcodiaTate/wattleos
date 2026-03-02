// src/lib/validations/environment-planner.ts
//
// ============================================================
// Prepared Environment Planner - Validation Schemas
// ============================================================

import { z } from "zod";

// ── Plans ──────────────────────────────────────────────────

export const CreateEnvironmentPlanSchema = z.object({
  location_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  theme: z.string().max(200).optional().nullable(),
  effective_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  effective_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateEnvironmentPlanSchema =
  CreateEnvironmentPlanSchema.partial().extend({
    status: z.enum(["draft", "active", "archived"]).optional(),
  });

export const ListEnvironmentPlansSchema = z
  .object({
    location_id: z.string().uuid().optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    page: z.number().int().positive().optional(),
    per_page: z.number().int().positive().max(100).optional(),
  })
  .partial();

// ── Shelf Slots ────────────────────────────────────────────

export const UpsertPlanShelfSlotSchema = z.object({
  plan_id: z.string().uuid(),
  slot_label: z.string().min(1).max(100),
  inventory_item_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  area: z.string().max(100).optional().nullable(),
  age_range_notes: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const BulkUpsertSlotsSchema = z.object({
  plan_id: z.string().uuid(),
  slots: z
    .array(UpsertPlanShelfSlotSchema.omit({ plan_id: true }))
    .min(1)
    .max(200),
});

export const DeletePlanSlotSchema = z.object({
  slot_id: z.string().uuid(),
});

// ── Rotation Schedules ─────────────────────────────────────

export const CreateRotationScheduleSchema = z.object({
  location_id: z.string().uuid().optional().nullable(),
  plan_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  theme_type: z.enum(["seasonal", "thematic", "developmental", "custom"]),
  theme_label: z.string().max(200).optional().nullable(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rationale: z.string().max(2000).optional().nullable(),
});

export const UpdateRotationScheduleSchema =
  CreateRotationScheduleSchema.partial().extend({
    status: z
      .enum(["upcoming", "in_progress", "completed", "cancelled"])
      .optional(),
  });

export const CompleteRotationSchema = z.object({
  materials_added: z.string().max(2000).optional().nullable(),
  materials_removed: z.string().max(2000).optional().nullable(),
  outcome_notes: z.string().max(2000).optional().nullable(),
});

export const ListRotationSchedulesSchema = z
  .object({
    location_id: z.string().uuid().optional(),
    status: z
      .enum(["upcoming", "in_progress", "completed", "cancelled"])
      .optional(),
    from_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    page: z.number().int().positive().optional(),
    per_page: z.number().int().positive().max(100).optional(),
  })
  .partial();

// ── Exported Input Types ───────────────────────────────────

export type CreateEnvironmentPlanInput = z.infer<
  typeof CreateEnvironmentPlanSchema
>;
export type UpdateEnvironmentPlanInput = z.infer<
  typeof UpdateEnvironmentPlanSchema
>;
export type ListEnvironmentPlansInput = z.input<
  typeof ListEnvironmentPlansSchema
>;
export type UpsertPlanShelfSlotInput = z.infer<
  typeof UpsertPlanShelfSlotSchema
>;
export type BulkUpsertSlotsInput = z.infer<typeof BulkUpsertSlotsSchema>;
export type CreateRotationScheduleInput = z.infer<
  typeof CreateRotationScheduleSchema
>;
export type UpdateRotationScheduleInput = z.infer<
  typeof UpdateRotationScheduleSchema
>;
export type CompleteRotationInput = z.infer<typeof CompleteRotationSchema>;
export type ListRotationSchedulesInput = z.input<
  typeof ListRotationSchedulesSchema
>;
