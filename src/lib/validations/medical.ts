// src/lib/validations/medical.ts
//
// ============================================================
// Zod Schemas — Medical Conditions
// ============================================================
// Tier 2: Authenticated but HEALTH-CRITICAL. Allergies,
// anaphylaxis plans, medication requirements. A severity
// of "life_threatening" vs "mild" changes how the school
// responds in an emergency.
// ============================================================

import { z } from "zod";

// WHY literal union: Matches MedicalSeverity from domain.ts.
// Prevents invalid values like "bad" sneaking in.
const medicalSeverityEnum = z.enum([
  "mild",
  "moderate",
  "severe",
  "life_threatening",
]);

// ────────────────────────────────────────────────────────────
// Create Medical Condition
// ────────────────────────────────────────────────────────────

export const createMedicalConditionSchema = z.object({
  student_id: z.string("Student is required").uuid("Invalid student ID"),

  condition_type: z
    .string()
    .trim()
    .min(1, "Condition type is required")
    .max(100, "Condition type is too long"),

  condition_name: z
    .string()
    .trim()
    .min(1, "Condition name is required")
    .max(200, "Condition name is too long"),

  severity: medicalSeverityEnum,

  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  action_plan: z
    .string()
    .trim()
    .max(5000, "Action plan is too long")
    .nullish()
    .transform((v) => v || null),

  action_plan_doc_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  requires_medication: z.boolean().optional().default(false),

  medication_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  medication_location: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  expiry_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),
});

export type CreateMedicalConditionInput = z.infer<
  typeof createMedicalConditionSchema
>;

// ────────────────────────────────────────────────────────────
// Update Medical Condition
// ────────────────────────────────────────────────────────────

export const updateMedicalConditionSchema = z.object({
  condition_type: z
    .string()
    .trim()
    .min(1, "Condition type cannot be empty")
    .max(100)
    .optional(),

  condition_name: z
    .string()
    .trim()
    .min(1, "Condition name cannot be empty")
    .max(200)
    .optional(),

  severity: medicalSeverityEnum.optional(),

  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  action_plan: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),

  action_plan_doc_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  requires_medication: z.boolean().optional(),

  medication_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  medication_location: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  expiry_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),
});

export type UpdateMedicalConditionInput = z.infer<
  typeof updateMedicalConditionSchema
>;
