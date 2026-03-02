// src/lib/validations/work-cycle.ts
//
// ============================================================
// Work Cycle Integrity Tracking - Zod Schemas
// ============================================================

import { z } from "zod";

const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS");

const InterruptionSourceSchema = z.enum([
  "pa_announcement",
  "specialist_pullout",
  "fire_drill",
  "visitor",
  "admin_request",
  "peer_disruption",
  "staff_interruption",
  "technology",
  "noise_external",
  "other",
]);

const InterruptionSeveritySchema = z.enum(["minor", "moderate", "severe"]);

// ============================================================
// Create Session
// ============================================================

export const CreateWorkCycleSessionSchema = z.object({
  class_id: z.string().uuid(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planned_start_time: TimeSchema,
  planned_end_time: TimeSchema,
  actual_start_time: TimeSchema.nullish(),
  actual_end_time: TimeSchema.nullish(),
  quality_rating: z.number().int().min(1).max(5).nullish(),
  completed_full_cycle: z.boolean().default(false),
  general_notes: z.string().max(4000).nullish(),
});

export type CreateWorkCycleSessionInput = z.infer<
  typeof CreateWorkCycleSessionSchema
>;

// ============================================================
// Update Session
// ============================================================

export const UpdateWorkCycleSessionSchema = z.object({
  actual_start_time: TimeSchema.nullish(),
  actual_end_time: TimeSchema.nullish(),
  quality_rating: z.number().int().min(1).max(5).nullish(),
  completed_full_cycle: z.boolean().optional(),
  general_notes: z.string().max(4000).nullish(),
});

export type UpdateWorkCycleSessionInput = z.infer<
  typeof UpdateWorkCycleSessionSchema
>;

// ============================================================
// Create Interruption
// ============================================================

export const CreateInterruptionSchema = z.object({
  session_id: z.string().uuid(),
  occurred_at: TimeSchema,
  duration_minutes: z.number().int().min(0).max(180),
  source: InterruptionSourceSchema,
  severity: InterruptionSeveritySchema,
  description: z.string().max(2000).nullish(),
  preventable: z.boolean().default(true),
});

export type CreateInterruptionInput = z.infer<typeof CreateInterruptionSchema>;

// ============================================================
// List Sessions filter
// ============================================================

export const ListSessionsSchema = z.object({
  class_id: z.string().uuid().optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// z.input preserves optional/default fields as optional in the calling type
export type ListSessionsInput = z.input<typeof ListSessionsSchema>;
