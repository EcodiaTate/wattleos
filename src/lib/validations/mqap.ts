// src/lib/validations/mqap.ts
//
// ============================================================
// WattleOS V2 - Module K: MQ:AP Self-Assessment Validation
// Schemas (Montessori Quality: Authentic Practice)
// ============================================================

import { z } from "zod";

// ============================================================
// Enums
// ============================================================

const mqapRatingEnum = z.enum(["working_towards", "meeting", "exceeding"]);
const mqapGoalStatusEnum = z.enum(["not_started", "in_progress", "achieved"]);

// ============================================================
// Assessment Schemas
// ============================================================

export const upsertMqapAssessmentSchema = z.object({
  criteria_id: z.string().uuid("Invalid criteria ID"),
  rating: mqapRatingEnum.nullable(),
  strengths: z
    .string()
    .trim()
    .max(5000, "Strengths text must be under 5000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type UpsertMqapAssessmentInput = z.infer<
  typeof upsertMqapAssessmentSchema
>;

// ============================================================
// Goal Schemas
// ============================================================

export const createMqapGoalSchema = z.object({
  criteria_id: z.string().uuid("Invalid criteria ID"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be under 2000 characters"),
  strategies: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  responsible_person_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  success_measures: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateMqapGoalInput = z.infer<typeof createMqapGoalSchema>;

export const updateMqapGoalSchema = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(2000).optional(),
  strategies: z.string().trim().max(5000).nullish(),
  responsible_person_id: z.string().uuid().nullish(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  success_measures: z.string().trim().max(2000).nullish(),
  status: mqapGoalStatusEnum.optional(),
});

export type UpdateMqapGoalInput = z.infer<typeof updateMqapGoalSchema>;
