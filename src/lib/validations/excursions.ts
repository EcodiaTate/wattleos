// src/lib/validations/excursions.ts
//
// ============================================================
// Zod Schemas - Excursions (Reg 100-102)
// ============================================================
// Tier 2: Authenticated + permissioned, child safety-critical.
// Excursion planning, risk assessment, consent management,
// and headcount recording during field trips.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Shared enums
// ────────────────────────────────────────────────────────────

const transportTypes = [
  "walking",
  "private_vehicle",
  "bus",
  "public_transport",
  "other",
] as const;

const riskLevels = ["low", "medium", "high"] as const;

const consentStatuses = ["pending", "consented", "declined"] as const;

const consentMethods = ["digital_portal", "paper", "verbal"] as const;

// ────────────────────────────────────────────────────────────
// Create Excursion
// ────────────────────────────────────────────────────────────

export const createExcursionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Excursion name is required")
    .max(200, "Name is too long"),

  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),

  excursion_date: z.string().date("Please enter a valid date (YYYY-MM-DD)"),

  destination: z
    .string()
    .trim()
    .min(1, "Destination is required")
    .max(500, "Destination is too long"),

  transport_type: z.enum(transportTypes, {
    message: "Select a transport type",
  }),

  departure_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:MM)")
    .optional(),

  return_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:MM)")
    .optional(),

  supervising_educator_ids: z
    .array(z.string().uuid())
    .min(1, "At least one supervising educator is required"),

  attending_student_ids: z
    .array(z.string().uuid())
    .min(1, "At least one student must be attending"),

  is_regular: z.boolean().default(false),

  regular_review_due: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),
});

export type CreateExcursionInput = z.infer<typeof createExcursionSchema>;

// ────────────────────────────────────────────────────────────
// Update Excursion
// ────────────────────────────────────────────────────────────

export const updateExcursionSchema = createExcursionSchema.partial();

export type UpdateExcursionInput = z.infer<typeof updateExcursionSchema>;

// ────────────────────────────────────────────────────────────
// Risk Assessment
// ────────────────────────────────────────────────────────────

const hazardSchema = z.object({
  hazard: z.string().trim().min(1, "Describe the hazard").max(500),
  likelihood: z.enum(riskLevels),
  consequence: z.enum(riskLevels),
  controls: z.string().trim().min(1, "Control measures are required").max(1000),
  residual_rating: z.enum(riskLevels),
});

export const riskAssessmentSchema = z.object({
  excursion_id: z.string().uuid(),

  hazards: z
    .array(hazardSchema)
    .min(1, "At least one hazard must be identified"),

  overall_risk_rating: z.enum(riskLevels, {
    message: "Select an overall risk rating",
  }),

  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
});

export type RiskAssessmentInput = z.infer<typeof riskAssessmentSchema>;

// ────────────────────────────────────────────────────────────
// Consent Response (parent submitting consent)
// ────────────────────────────────────────────────────────────

export const consentResponseSchema = z.object({
  excursion_id: z.string().uuid(),
  student_id: z.string().uuid(),
  consent_status: z.enum(["consented", "declined"], {
    message: "Consent must be either granted or declined",
  }),
  method: z.enum(consentMethods).default("digital_portal"),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
});

export type ConsentResponseInput = z.infer<typeof consentResponseSchema>;

// ────────────────────────────────────────────────────────────
// Headcount Record
// ────────────────────────────────────────────────────────────

export const headcountSchema = z.object({
  excursion_id: z.string().uuid(),
  student_ids_present: z.array(z.string().uuid()).min(0),
  location_note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
});

export type HeadcountInput = z.infer<typeof headcountSchema>;
