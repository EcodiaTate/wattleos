// src/lib/validations/three-period-lessons.ts
// ============================================================
// WattleOS V2 - Three-Period Lesson & Sensitive Period Schemas
// ============================================================

import { z } from "zod";

// ── Three-Period Lesson ──────────────────────────────────────

export const ThreePeriodStatusSchema = z.enum([
  "not_started",
  "completed",
  "needs_repeat",
]);

export const CreateThreePeriodLessonSchema = z.object({
  student_id: z.string().uuid(),
  material_id: z.string().uuid(),
  lesson_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  // Period 1 is always recorded on create
  period_1_status: ThreePeriodStatusSchema,
  period_1_notes: z.string().max(1000).nullable().optional(),
  // Period 2: optional on create (may be a follow-up session)
  period_2_status: ThreePeriodStatusSchema.optional(),
  period_2_notes: z.string().max(1000).nullable().optional(),
  // Period 3: optional on create
  period_3_status: ThreePeriodStatusSchema.optional(),
  period_3_notes: z.string().max(1000).nullable().optional(),
  session_notes: z.string().max(2000).nullable().optional(),
});

export const UpdateThreePeriodLessonSchema = z.object({
  period_1_status: ThreePeriodStatusSchema.optional(),
  period_1_notes: z.string().max(1000).nullable().optional(),
  period_2_status: ThreePeriodStatusSchema.optional(),
  period_2_notes: z.string().max(1000).nullable().optional(),
  period_3_status: ThreePeriodStatusSchema.optional(),
  period_3_notes: z.string().max(1000).nullable().optional(),
  session_notes: z.string().max(2000).nullable().optional(),
});

export const ListThreePeriodLessonsSchema = z.object({
  student_id: z.string().uuid().optional(),
  material_id: z.string().uuid().optional(),
  area: z
    .enum([
      "practical_life",
      "sensorial",
      "language",
      "mathematics",
      "cultural",
    ])
    .optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type CreateThreePeriodLessonInput = z.infer<
  typeof CreateThreePeriodLessonSchema
>;
export type UpdateThreePeriodLessonInput = z.infer<
  typeof UpdateThreePeriodLessonSchema
>;
export type ListThreePeriodLessonsInput = z.infer<
  typeof ListThreePeriodLessonsSchema
>;

// ── Sensitive Periods ────────────────────────────────────────

export const MontessoriSensitivePeriodSchema = z.enum([
  "language",
  "order",
  "movement",
  "small_objects",
  "music",
  "social_behavior",
  "reading",
  "writing",
  "mathematics",
  "refinement_of_senses",
]);

export const SensitivePeriodIntensitySchema = z.enum([
  "emerging",
  "active",
  "peak",
  "waning",
]);

export const CreateSensitivePeriodSchema = z.object({
  student_id: z.string().uuid(),
  sensitive_period: MontessoriSensitivePeriodSchema,
  intensity: SensitivePeriodIntensitySchema,
  observed_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  observed_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  suggested_material_ids: z.array(z.string().uuid()).default([]),
  notes: z.string().max(2000).nullable().optional(),
});

export const UpdateSensitivePeriodSchema = z.object({
  intensity: SensitivePeriodIntensitySchema.optional(),
  observed_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  observed_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  suggested_material_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type CreateSensitivePeriodInput = z.infer<
  typeof CreateSensitivePeriodSchema
>;
export type UpdateSensitivePeriodInput = z.infer<
  typeof UpdateSensitivePeriodSchema
>;
