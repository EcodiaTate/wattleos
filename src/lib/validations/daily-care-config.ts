// src/lib/validations/daily-care-config.ts
//
// ============================================================
// WattleOS V2 - Daily Care Log Field Config Validations
// ============================================================
// Zod schemas for per-room field configuration mutations.
// ============================================================

import { z } from "zod";
import { careEntryTypeEnum } from "@/lib/validations/daily-care";

// ── Field type enum (re-export for convenience) ──────────────
export { careEntryTypeEnum };

// ── Color tag enum ───────────────────────────────────────────
export const colorTagEnum = z.enum([
  "health",
  "nutrition",
  "behavior",
  "hygiene",
  "sleep",
  "general",
]);

// ── Single field config item ──────────────────────────────────
export const fieldConfigItemSchema = z.object({
  field_type: careEntryTypeEnum,
  is_enabled: z.boolean(),
  is_required: z.boolean(),
  display_order: z.number().int().min(0).max(999),
  field_label: z
    .string()
    .trim()
    .max(100, "Label must be under 100 characters")
    .nullish()
    .transform((v) => v || null),
  field_description: z
    .string()
    .trim()
    .max(300, "Description must be under 300 characters")
    .nullish()
    .transform((v) => v || null),
  color_tag: colorTagEnum.nullish().transform((v) => v || null),
});

export type FieldConfigItemInput = z.infer<typeof fieldConfigItemSchema>;
export type FieldConfigItemRawInput = z.input<typeof fieldConfigItemSchema>;

// ── Update field configs (batch) ──────────────────────────────
export const updateDailyCareConfigSchema = z.object({
  class_id: z.string().uuid("Invalid class ID"),
  configs: z
    .array(fieldConfigItemSchema)
    .min(1, "At least one field config is required")
    .max(7, "Maximum 7 field types"),
});

export type UpdateDailyCareConfigInput = z.infer<
  typeof updateDailyCareConfigSchema
>;
export type UpdateDailyCareConfigRawInput = z.input<
  typeof updateDailyCareConfigSchema
>;
