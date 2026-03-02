// src/lib/validations/emergency-drills.ts
//
// ============================================================
// Zod Schemas - Emergency Drill Tracking (Reg 97)
// ============================================================

import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────

const drillTypes = [
  "fire_evacuation",
  "lockdown",
  "shelter_in_place",
  "medical_emergency",
  "other",
] as const;

const effectivenessRatings = ["poor", "fair", "good", "excellent"] as const;

const drillStatuses = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

// ── Create Drill ────────────────────────────────────────────

export const createDrillSchema = z
  .object({
    drill_type: z.enum(drillTypes, {
      message: "Select a drill type",
    }),
    drill_type_other: z
      .string()
      .trim()
      .max(200, "Must be under 200 characters")
      .nullish()
      .transform((v) => v || null),
    scenario_description: z
      .string()
      .trim()
      .max(2000, "Must be under 2000 characters")
      .nullish()
      .transform((v) => v || null),
    scheduled_date: z.string().date("Please enter a valid date (YYYY-MM-DD)"),
    scheduled_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:MM)")
      .nullish()
      .transform((v) => v || null),
    assembly_point: z
      .string()
      .trim()
      .max(500, "Must be under 500 characters")
      .nullish()
      .transform((v) => v || null),
    location_notes: z
      .string()
      .trim()
      .max(1000, "Must be under 1000 characters")
      .nullish()
      .transform((v) => v || null),
    is_whole_of_service: z.boolean().default(false),
    participating_class_ids: z.array(z.string().uuid()).default([]),
    staff_participant_ids: z.array(z.string().uuid()).default([]),
    notes: z
      .string()
      .trim()
      .max(2000, "Must be under 2000 characters")
      .nullish()
      .transform((v) => v || null),
  })
  .refine(
    (d) =>
      d.drill_type !== "other" ||
      (d.drill_type_other && d.drill_type_other.trim().length > 0),
    {
      message: "Describe the drill type when selecting 'Other'",
      path: ["drill_type_other"],
    },
  );

export type CreateDrillInput = z.infer<typeof createDrillSchema>;

// ── Update Drill ────────────────────────────────────────────

export const updateDrillSchema = z.object({
  drill_type: z.enum(drillTypes).optional(),
  drill_type_other: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  scenario_description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  scheduled_date: z.string().date("Please enter a valid date").optional(),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time")
    .nullish()
    .transform((v) => v || null),
  assembly_point: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
  location_notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
  is_whole_of_service: z.boolean().optional(),
  participating_class_ids: z.array(z.string().uuid()).optional(),
  staff_participant_ids: z.array(z.string().uuid()).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateDrillInput = z.infer<typeof updateDrillSchema>;

// ── Complete Drill ──────────────────────────────────────────

export const completeDrillSchema = z.object({
  evacuation_time_seconds: z
    .number()
    .int()
    .min(0)
    .max(7200)
    .nullish()
    .transform((v) => v ?? null),
});

export type CompleteDrillInput = z.infer<typeof completeDrillSchema>;

// ── Debrief ─────────────────────────────────────────────────

export const debriefSchema = z.object({
  effectiveness_rating: z.enum(effectivenessRatings, {
    message: "Rate the drill effectiveness",
  }),
  issues_observed: z
    .string()
    .trim()
    .max(2000, "Must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
  corrective_actions: z
    .string()
    .trim()
    .max(2000, "Must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
  follow_up_required: z.boolean().default(false),
  follow_up_notes: z
    .string()
    .trim()
    .max(1000, "Must be under 1000 characters")
    .nullish()
    .transform((v) => v || null),
  debrief_notes: z
    .string()
    .trim()
    .max(2000, "Must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type DebriefInput = z.infer<typeof debriefSchema>;

// ── Update Participant ──────────────────────────────────────

export const updateParticipantSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  accounted_for: z.boolean(),
  assembly_time_seconds: z
    .number()
    .int()
    .min(0)
    .max(7200)
    .nullish()
    .transform((v) => v ?? null),
  response_notes: z
    .string()
    .trim()
    .max(500, "Must be under 500 characters")
    .nullish()
    .transform((v) => v || null),
  needed_assistance: z.boolean().default(false),
});

export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;

// ── Bulk Account ────────────────────────────────────────────

export const bulkAccountSchema = z.object({
  student_ids: z
    .array(z.string().uuid())
    .min(1, "At least one student is required"),
});

export type BulkAccountInput = z.infer<typeof bulkAccountSchema>;

// ── List Drills Filter ──────────────────────────────────────

export const listDrillsFilterSchema = z.object({
  drill_type: z.enum(drillTypes).nullish(),
  status: z.enum(drillStatuses).nullish(),
  from_date: z.string().date().nullish(),
  to_date: z.string().date().nullish(),
});

export type ListDrillsFilter = z.infer<typeof listDrillsFilterSchema>;
