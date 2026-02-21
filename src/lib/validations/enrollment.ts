// src/lib/validations/enrollment.ts
//
// ============================================================
// Zod Schemas — Enrollment (Module 10)
// ============================================================
// Tier 1: Both endpoints are PUBLIC (no auth required).
// submitEnrollmentApplication: Parents fill a multi-step form.
// acceptInvitation: Parent clicks email link with a token.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Nested object schemas (used inside the application)
// ────────────────────────────────────────────────────────────

export const applicationGuardianSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Guardian first name is required")
    .max(100),
  last_name: z
    .string()
    .trim()
    .min(1, "Guardian last name is required")
    .max(100),
  email: z
    .string()
    .trim()
    .email("Valid guardian email is required")
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),
  relationship: z.string().trim().min(1, "Relationship is required").max(50),
  is_primary: z.boolean(),
  is_emergency_contact: z.boolean(),
  pickup_authorized: z.boolean(),
  address: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
});

export const applicationMedicalConditionSchema = z.object({
  condition_type: z.string().trim().min(1).max(100),
  condition_name: z.string().trim().min(1).max(200),
  severity: z.string().trim().min(1).max(50),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  action_plan: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  requires_medication: z.boolean(),
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
});

export const applicationEmergencyContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required").max(200),
  relationship: z.string().trim().min(1, "Relationship is required").max(50),
  phone_primary: z.string().trim().min(1, "Phone number is required").max(30),
  phone_secondary: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .nullish()
    .transform((v) => v?.toLowerCase() || null),
  priority_order: z.number().int().min(1).max(10),
});

export const applicationCustodyRestrictionSchema = z.object({
  restricted_person_name: z.string().trim().min(1).max(200),
  restriction_type: z.string().trim().min(1).max(50),
  court_order_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
});

// ────────────────────────────────────────────────────────────
// Submit Enrollment Application (Public — no auth)
// ────────────────────────────────────────────────────────────

export const submitEnrollmentApplicationSchema = z.object({
  // The tenantId is passed as a separate arg in the action,
  // so it's not in this schema. Only the form payload is here.

  enrollment_period_id: z
    .string("Enrollment period is required")
    .uuid("Invalid enrollment period"),

  submitted_by_email: z
    .string()
    .trim()
    .min(1, "Parent email is required")
    .email("Please enter a valid email address")
    .max(254)
    .transform((v) => v.toLowerCase()),

  // ── Child details ───────────────────────────────────────
  child_first_name: z
    .string()
    .trim()
    .min(1, "Child first name is required")
    .max(100),

  child_last_name: z
    .string()
    .trim()
    .min(1, "Child last name is required")
    .max(100),

  child_preferred_name: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v || null),

  child_date_of_birth: z
    .string("Child date of birth is required")
    .date("Please enter a valid date (YYYY-MM-DD)"),

  child_gender: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),

  child_nationality: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v || null),

  child_languages: z.array(z.string().trim().max(50)).optional().default([]),

  child_previous_school: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  // ── Program preferences ─────────────────────────────────
  requested_program: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v || null),

  requested_start_date: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),

  // ── Re-enrollment ───────────────────────────────────────
  existing_student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),

  // ── Guardians (min 1) ───────────────────────────────────
  guardians: z
    .array(applicationGuardianSchema)
    .min(1, "At least one guardian is required")
    .max(6, "Maximum 6 guardians allowed"),

  // ── Medical ─────────────────────────────────────────────
  medical_conditions: z
    .array(applicationMedicalConditionSchema)
    .optional()
    .default([]),

  // ── Emergency contacts (min 2) ──────────────────────────
  emergency_contacts: z
    .array(applicationEmergencyContactSchema)
    .min(2, "At least two emergency contacts are required")
    .max(6, "Maximum 6 emergency contacts allowed"),

  // ── Custody ─────────────────────────────────────────────
  custody_restrictions: z
    .array(applicationCustodyRestrictionSchema)
    .optional()
    .default([]),

  // ── Consents ────────────────────────────────────────────
  media_consent: z.boolean(),
  directory_consent: z.boolean(),

  terms_accepted: z
    .boolean()
    .refine((v) => v === true, "Terms must be accepted"),

  privacy_accepted: z
    .boolean()
    .refine((v) => v === true, "Privacy policy must be accepted"),

  // ── Custom responses ────────────────────────────────────
  custom_responses: z.record(z.string(), z.unknown()).optional().default({}),
});

export type SubmitEnrollmentApplicationInput = z.infer<
  typeof submitEnrollmentApplicationSchema
>;

// ────────────────────────────────────────────────────────────
// Accept Invitation (Public — token-based auth)
// ────────────────────────────────────────────────────────────
// Simple: just validates the token is a non-empty string.
// The action itself does all the DB verification.

export const acceptInvitationSchema = z.object({
  token: z
    .string("Invitation token is required")
    .trim()
    .min(1, "Invitation token is required")
    .max(500, "Invalid token"),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
