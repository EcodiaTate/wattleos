// src/lib/validations/lessons.ts
//
// ============================================================
// Zod Schemas - Montessori Lesson Tracking (Module J)
// ============================================================

import { z } from "zod";

const montessoriAreas = [
  "practical_life",
  "sensorial",
  "language",
  "mathematics",
  "cultural",
] as const;

const ageLevels = ["0_3", "3_6", "6_9", "9_12"] as const;

const lessonStages = ["introduction", "practice", "mastery"] as const;

const childResponses = [
  "engaged",
  "struggled",
  "not_ready",
  "mastered",
  "other",
] as const;

const concentrationLevels = [
  "deep",
  "moderate",
  "distracted",
  "not_observed",
] as const;

// ────────────────────────────────────────────────────────────
// Create Lesson Record
// ────────────────────────────────────────────────────────────

export const createLessonRecordSchema = z.object({
  student_id: z.string().uuid(),
  material_id: z.string().uuid(),
  presentation_date: z.string().date("Enter a valid date"),
  stage: z.enum(lessonStages),
  child_response: z.enum(childResponses).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
});

export type CreateLessonRecordInput = z.infer<typeof createLessonRecordSchema>;

// ────────────────────────────────────────────────────────────
// Update Lesson Record
// ────────────────────────────────────────────────────────────

export const updateLessonRecordSchema = createLessonRecordSchema.partial();

export type UpdateLessonRecordInput = z.infer<typeof updateLessonRecordSchema>;

// ────────────────────────────────────────────────────────────
// Create Work Cycle Session
// ────────────────────────────────────────────────────────────

const interruptionSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter time as HH:MM"),
  reason: z.string().trim().min(1).max(300),
  duration_minutes: z.number().int().min(0).max(120),
});

export const createWorkCycleSessionSchema = z.object({
  class_id: z.string().uuid().optional(),
  session_date: z.string().date("Enter a valid date"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter time as HH:MM"),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter time as HH:MM")
    .optional(),
  interruptions: z.array(interruptionSchema).default([]),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
});

export type CreateWorkCycleSessionInput = z.infer<
  typeof createWorkCycleSessionSchema
>;

// ────────────────────────────────────────────────────────────
// Material Selection (during a work cycle)
// ────────────────────────────────────────────────────────────

export const materialSelectionSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  material_id: z.string().uuid().optional(),
  material_free_text: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || undefined),
  concentration_level: z.enum(concentrationLevels).optional(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || undefined),
});

export type MaterialSelectionInput = z.infer<typeof materialSelectionSchema>;
