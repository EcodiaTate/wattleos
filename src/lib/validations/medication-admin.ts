// src/lib/validations/medication-admin.ts
//
// ============================================================
// Zod Schemas - Medication Administration (Reg 93/94)
// ============================================================
// Tier 2: Authenticated, HEALTH-CRITICAL. Every dose must be
// witnessed, authorised, and recorded. Medical management plans
// (ASCIA, asthma, diabetes) must be on file before medication
// can be administered.
// ============================================================

import { z } from "zod";

const medicalPlanTypeEnum = z.enum([
  "ascia_anaphylaxis",
  "asthma",
  "diabetes",
  "seizure",
  "other",
]);

const medicationRouteEnum = z.enum([
  "oral",
  "inhaled",
  "injected",
  "topical",
  "other",
]);

// ────────────────────────────────────────────────────────────
// Create Medical Management Plan
// ────────────────────────────────────────────────────────────

export const createMedicalPlanSchema = z.object({
  student_id: z.string("Student is required").uuid("Invalid student ID"),

  plan_type: medicalPlanTypeEnum,

  condition_name: z
    .string()
    .trim()
    .min(1, "Condition name is required")
    .max(200, "Condition name is too long"),

  document_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  expiry_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  review_due_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateMedicalPlanInput = z.infer<typeof createMedicalPlanSchema>;

// ────────────────────────────────────────────────────────────
// Update Medical Management Plan
// ────────────────────────────────────────────────────────────

export const updateMedicalPlanSchema = z.object({
  plan_type: medicalPlanTypeEnum.optional(),

  condition_name: z
    .string()
    .trim()
    .min(1, "Condition name cannot be empty")
    .max(200)
    .optional(),

  document_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  expiry_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  review_due_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  is_active: z.boolean().optional(),

  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateMedicalPlanInput = z.infer<typeof updateMedicalPlanSchema>;

// ────────────────────────────────────────────────────────────
// Create Medication Authorisation
// ────────────────────────────────────────────────────────────

export const createMedicationAuthorisationSchema = z.object({
  student_id: z.string("Student is required").uuid("Invalid student ID"),

  medication_name: z
    .string()
    .trim()
    .min(1, "Medication name is required")
    .max(200, "Medication name is too long"),

  dose: z
    .string()
    .trim()
    .min(1, "Dose is required")
    .max(100, "Dose is too long"),

  route: medicationRouteEnum,

  frequency: z
    .string()
    .trim()
    .min(1, "Frequency is required")
    .max(200, "Frequency is too long"),

  reason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),

  authorised_by_name: z
    .string()
    .trim()
    .min(1, "Authorised by name is required")
    .max(200),

  authorised_by_user_id: z
    .string()
    .uuid("Invalid user ID")
    .nullish()
    .transform((v) => v || null),

  authorisation_date: z.string().date("Please enter a valid date (YYYY-MM-DD)"),

  valid_from: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  valid_until: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  storage_instructions: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
});

export type CreateMedicationAuthorisationInput = z.infer<
  typeof createMedicationAuthorisationSchema
>;

// ────────────────────────────────────────────────────────────
// Record Medication Administration (immutable once created)
// ────────────────────────────────────────────────────────────

export const recordMedicationAdministrationSchema = z.object({
  student_id: z.string("Student is required").uuid("Invalid student ID"),

  authorisation_id: z
    .string()
    .uuid("Invalid authorisation ID")
    .nullish()
    .transform((v) => v || null),

  administered_at: z.string().datetime("Please enter a valid date/time"),

  medication_name: z
    .string()
    .trim()
    .min(1, "Medication name is required")
    .max(200),

  dose_given: z.string().trim().min(1, "Dose is required").max(100),

  route: medicationRouteEnum,

  witness_id: z
    .string()
    .uuid("Invalid witness ID")
    .nullish()
    .transform((v) => v || null),

  parent_notified: z.boolean().default(false),

  child_response: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type RecordMedicationAdministrationInput = z.infer<
  typeof recordMedicationAdministrationSchema
>;
