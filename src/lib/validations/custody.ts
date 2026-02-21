// src/lib/validations/custody.ts
//
// ============================================================
// Zod Schemas — Custody Restrictions
// ============================================================
// Tier 2: Authenticated but SAFETY-CRITICAL. Court orders,
// no-contact restrictions. Wrong data here has real-world
// consequences for child safety.
// ============================================================

import { z } from "zod";

// WHY literal union: Matches the RestrictionType from domain.ts.
// Zod validates the value is one of these at runtime, not just
// "some string". Prevents typos like "no_contcat" getting in.
const restrictionTypeEnum = z.enum([
  "no_contact",
  "no_pickup",
  "supervised_only",
  "no_information",
]);

// ────────────────────────────────────────────────────────────
// Create Custody Restriction
// ────────────────────────────────────────────────────────────

export const createCustodyRestrictionSchema = z.object({
  student_id: z.string("Student is required").uuid("Invalid student ID"),

  restricted_person_name: z
    .string()
    .trim()
    .min(1, "Restricted person name is required")
    .max(200, "Name is too long"),

  restriction_type: restrictionTypeEnum,

  court_order_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  court_order_doc_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  effective_date: z
    .string("Effective date is required")
    .date("Please enter a valid date (YYYY-MM-DD)"),

  expiry_date: z
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

export type CreateCustodyRestrictionInput = z.infer<
  typeof createCustodyRestrictionSchema
>;

// ────────────────────────────────────────────────────────────
// Update Custody Restriction
// ────────────────────────────────────────────────────────────
// All fields optional — only provided fields are updated.
// WHY .partial() is not used: We need .nullish() transforms
// on optional string fields, which .partial() doesn't support.

export const updateCustodyRestrictionSchema = z.object({
  restricted_person_name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(200)
    .optional(),

  restriction_type: restrictionTypeEnum.optional(),

  court_order_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  court_order_doc_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  effective_date: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .optional(),

  expiry_date: z
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

export type UpdateCustodyRestrictionInput = z.infer<
  typeof updateCustodyRestrictionSchema
>;
