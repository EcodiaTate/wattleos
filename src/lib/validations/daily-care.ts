// src/lib/validations/daily-care.ts
//
// ============================================================
// WattleOS V2 - Daily Care Log Validations (Module O, Reg 162)
// ============================================================
// Zod schemas for all Daily Care Log mutations.
// ============================================================

import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────

export const careEntryTypeEnum = z.enum([
  "nappy_change",
  "meal",
  "bottle",
  "sleep_start",
  "sleep_end",
  "sunscreen",
  "wellbeing_note",
]);

export const nappyTypeEnum = z.enum(["wet", "soiled", "dry"]);

export const mealTypeEnum = z.enum([
  "breakfast",
  "morning_tea",
  "lunch",
  "afternoon_tea",
  "late_snack",
]);

export const foodConsumedEnum = z.enum([
  "all",
  "most",
  "some",
  "little",
  "none",
]);

export const bottleTypeEnum = z.enum([
  "breast_milk",
  "formula",
  "water",
  "other",
]);

export const sleepPositionEnum = z.enum(["back", "side", "front"]);

export const sleepMannerEnum = z.enum([
  "self_settled",
  "patted",
  "rocked",
  "held",
  "fed_to_sleep",
]);

export const wellbeingMoodEnum = z.enum([
  "happy",
  "settled",
  "unsettled",
  "tired",
  "unwell",
]);

export const dailyCareLogStatusEnum = z.enum(["in_progress", "shared"]);

// ── Create Daily Care Log ────────────────────────────────────

export const createDailyCareLogSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  log_date: z.string().date("Log date must be YYYY-MM-DD"),
});

export type CreateDailyCareLogInput = z.infer<typeof createDailyCareLogSchema>;

// ── Create Care Entry ────────────────────────────────────────
// A single schema with conditional requirements based on
// entry_type. This matches the single-table design where
// type-specific fields are nullable.

export const createCareEntrySchema = z
  .object({
    student_id: z.string().uuid("Invalid student ID"),
    log_date: z.string().date("Log date must be YYYY-MM-DD"),
    entry_type: careEntryTypeEnum,
    recorded_at: z
      .string()
      .datetime({ message: "Invalid timestamp" })
      .optional(),

    // Nappy fields
    nappy_type: nappyTypeEnum.nullish().transform((v) => v || null),
    nappy_cream_applied: z
      .boolean()
      .nullish()
      .transform((v) => v ?? null),

    // Meal fields
    meal_type: mealTypeEnum.nullish().transform((v) => v || null),
    food_offered: z
      .string()
      .trim()
      .max(500, "Food offered must be under 500 characters")
      .nullish()
      .transform((v) => v || null),
    food_consumed: foodConsumedEnum.nullish().transform((v) => v || null),

    // Bottle fields
    bottle_type: bottleTypeEnum.nullish().transform((v) => v || null),
    bottle_amount_ml: z
      .number()
      .int()
      .min(0, "Amount must be 0 or more")
      .max(1000, "Amount must be under 1000ml")
      .nullish()
      .transform((v) => v ?? null),

    // Sleep fields
    sleep_position: sleepPositionEnum.nullish().transform((v) => v || null),
    sleep_manner: sleepMannerEnum.nullish().transform((v) => v || null),

    // Sunscreen fields
    sunscreen_spf: z
      .number()
      .int()
      .min(1, "SPF must be at least 1")
      .max(100, "SPF must be 100 or less")
      .nullish()
      .transform((v) => v ?? null),

    // Wellbeing fields
    wellbeing_mood: wellbeingMoodEnum.nullish().transform((v) => v || null),
    wellbeing_temperature: z
      .number()
      .min(34.0, "Temperature must be at least 34.0°C")
      .max(42.0, "Temperature must be at most 42.0°C")
      .nullish()
      .transform((v) => v ?? null),

    // Notes (all entry types)
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be under 2000 characters")
      .nullish()
      .transform((v) => v || null),
  })
  .superRefine((data, ctx) => {
    // Conditional validation based on entry_type
    if (data.entry_type === "nappy_change" && !data.nappy_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nappy type is required for nappy changes",
        path: ["nappy_type"],
      });
    }

    if (data.entry_type === "meal") {
      if (!data.meal_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Meal type is required",
          path: ["meal_type"],
        });
      }
      if (!data.food_consumed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Food consumed is required",
          path: ["food_consumed"],
        });
      }
    }

    if (data.entry_type === "bottle" && !data.bottle_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bottle type is required",
        path: ["bottle_type"],
      });
    }

    if (data.entry_type === "sleep_start") {
      if (!data.sleep_position) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sleep position is required",
          path: ["sleep_position"],
        });
      }
      if (!data.sleep_manner) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sleep manner is required",
          path: ["sleep_manner"],
        });
      }
    }

    if (data.entry_type === "sunscreen" && !data.sunscreen_spf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SPF is required for sunscreen entries",
        path: ["sunscreen_spf"],
      });
    }

    if (data.entry_type === "wellbeing_note" && !data.wellbeing_mood) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mood is required for wellbeing notes",
        path: ["wellbeing_mood"],
      });
    }
  });

/** Output type (after transforms - all nullable fields are `T | null`) */
export type CreateCareEntryInput = z.infer<typeof createCareEntrySchema>;
/** Input type (before transforms - nullable fields are optional) */
export type CreateCareEntryRawInput = z.input<typeof createCareEntrySchema>;

// ── Update Care Entry ────────────────────────────────────────

export const updateCareEntrySchema = z.object({
  recorded_at: z.string().datetime({ message: "Invalid timestamp" }).optional(),

  // All type-specific fields optional on update
  nappy_type: nappyTypeEnum.nullish().transform((v) => v || null),
  nappy_cream_applied: z
    .boolean()
    .nullish()
    .transform((v) => v ?? null),
  meal_type: mealTypeEnum.nullish().transform((v) => v || null),
  food_offered: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
  food_consumed: foodConsumedEnum.nullish().transform((v) => v || null),
  bottle_type: bottleTypeEnum.nullish().transform((v) => v || null),
  bottle_amount_ml: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .nullish()
    .transform((v) => v ?? null),
  sleep_position: sleepPositionEnum.nullish().transform((v) => v || null),
  sleep_manner: sleepMannerEnum.nullish().transform((v) => v || null),
  sunscreen_spf: z
    .number()
    .int()
    .min(1)
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  wellbeing_mood: wellbeingMoodEnum.nullish().transform((v) => v || null),
  wellbeing_temperature: z
    .number()
    .min(34.0)
    .max(42.0)
    .nullish()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateCareEntryInput = z.infer<typeof updateCareEntrySchema>;
export type UpdateCareEntryRawInput = z.input<typeof updateCareEntrySchema>;

// ── Sleep Check ──────────────────────────────────────────────

export const createSleepCheckSchema = z.object({
  entry_id: z.string().uuid("Invalid sleep entry ID"),
  checked_at: z.string().datetime({ message: "Invalid timestamp" }).optional(),
  position: sleepPositionEnum,
  breathing_normal: z.boolean().default(true),
  skin_colour_normal: z.boolean().default(true),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be under 500 characters")
    .nullish()
    .transform((v) => v || null),
});

export type CreateSleepCheckInput = z.infer<typeof createSleepCheckSchema>;

// ── Share Daily Care Log ─────────────────────────────────────

export const shareDailyCareLogSchema = z.object({
  log_id: z.string().uuid("Invalid log ID"),
  general_notes: z
    .string()
    .trim()
    .max(2000, "Notes must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type ShareDailyCareLogInput = z.infer<typeof shareDailyCareLogSchema>;
export type ShareDailyCareLogRawInput = z.input<typeof shareDailyCareLogSchema>;

// ── List Filters ─────────────────────────────────────────────

export const listDailyCareFilterSchema = z.object({
  date: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  status: dailyCareLogStatusEnum.nullish().transform((v) => v || null),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListDailyCareFilter = z.infer<typeof listDailyCareFilterSchema>;
export type ListDailyCareFilterRawInput = z.input<
  typeof listDailyCareFilterSchema
>;
