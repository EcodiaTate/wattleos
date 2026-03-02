// src/lib/validations/normalization.ts
//
// ============================================================
// Normalization Indicators - Zod Validation Schemas
// ============================================================

import { z } from "zod";

// ============================================================
// Shared enums
// ============================================================

const NormalizationIndicatorSchema = z.enum([
  "concentration",
  "independence",
  "order",
  "coordination",
  "social_harmony",
]);

const WorkCycleEngagementSchema = z.enum([
  "deep",
  "moderate",
  "surface",
  "disengaged",
]);

const SelfDirectionLevelSchema = z.enum([
  "fully_self_directed",
  "minimal_guidance",
  "frequent_guidance",
  "constant_support",
]);

const NormalizationGoalStatusSchema = z.enum([
  "active",
  "achieved",
  "deferred",
  "archived",
]);

const RatingSchema = z.number().int().min(1).max(5);

// ============================================================
// Create Observation
// ============================================================

export const CreateNormalizationObservationSchema = z.object({
  student_id: z.string().uuid(),
  observation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  class_id: z.string().uuid().nullish(),

  concentration_rating: RatingSchema,
  concentration_duration_minutes: z.number().int().min(0).max(300).nullish(),
  concentration_notes: z.string().max(2000).nullish(),

  independence_rating: RatingSchema,
  independence_notes: z.string().max(2000).nullish(),

  order_rating: RatingSchema,
  order_notes: z.string().max(2000).nullish(),

  coordination_rating: RatingSchema,
  coordination_notes: z.string().max(2000).nullish(),

  social_harmony_rating: RatingSchema,
  social_harmony_notes: z.string().max(2000).nullish(),

  work_cycle_engagement: WorkCycleEngagementSchema,
  self_direction: SelfDirectionLevelSchema,
  joyful_engagement: z.boolean(),
  overall_notes: z.string().max(4000).nullish(),
});

export type CreateNormalizationObservationInput = z.infer<
  typeof CreateNormalizationObservationSchema
>;

// ============================================================
// Update Observation
// ============================================================

export const UpdateNormalizationObservationSchema =
  CreateNormalizationObservationSchema.omit({ student_id: true }).partial();

export type UpdateNormalizationObservationInput = z.infer<
  typeof UpdateNormalizationObservationSchema
>;

// ============================================================
// Create Goal
// ============================================================

export const CreateNormalizationGoalSchema = z
  .object({
    student_id: z.string().uuid(),
    indicator: NormalizationIndicatorSchema,
    current_rating: RatingSchema,
    target_rating: RatingSchema,
    target_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullish(),
    strategy: z.string().min(1).max(4000),
    progress_notes: z.string().max(4000).nullish(),
  })
  .refine((data) => data.target_rating >= data.current_rating, {
    message: "Target rating must be equal to or higher than current rating",
    path: ["target_rating"],
  });

export type CreateNormalizationGoalInput = z.infer<
  typeof CreateNormalizationGoalSchema
>;

// ============================================================
// Update Goal
// ============================================================

export const UpdateNormalizationGoalSchema = z.object({
  current_rating: RatingSchema.optional(),
  target_rating: RatingSchema.optional(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  strategy: z.string().min(1).max(4000).optional(),
  progress_notes: z.string().max(4000).nullish(),
  status: NormalizationGoalStatusSchema.optional(),
});

export type UpdateNormalizationGoalInput = z.infer<
  typeof UpdateNormalizationGoalSchema
>;

// ============================================================
// List / Filter
// ============================================================

export const ListNormalizationObservationsSchema = z.object({
  student_id: z.string().uuid().nullish(),
  class_id: z.string().uuid().nullish(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  observer_id: z.string().uuid().nullish(),
});

export type ListNormalizationObservationsInput = z.input<
  typeof ListNormalizationObservationsSchema
>;

export const ListNormalizationGoalsSchema = z.object({
  student_id: z.string().uuid().nullish(),
  indicator: NormalizationIndicatorSchema.nullish(),
  status: NormalizationGoalStatusSchema.nullish(),
});

export type ListNormalizationGoalsInput = z.input<
  typeof ListNormalizationGoalsSchema
>;
