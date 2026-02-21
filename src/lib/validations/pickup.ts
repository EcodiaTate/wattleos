// src/lib/validations/pickup.ts
//
// ============================================================
// Zod Schemas — Pickup Authorizations
// ============================================================
// Tier 2: Authenticated but SAFETY-CRITICAL. Controls who is
// physically allowed to collect a child from school. Wrong
// data = wrong person leaves with a student.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Create Pickup Authorization
// ────────────────────────────────────────────────────────────

export const createPickupAuthorizationSchema = z.object({
  studentId: z.string("Student is required").uuid("Invalid student ID"),

  authorizedName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name is too long"),

  relationship: z.string().trim().max(100).optional(),

  phone: z.string().trim().max(30).optional(),

  photoUrl: z.string().url("Invalid photo URL").max(2000).optional(),

  isPermanent: z.boolean().optional().default(true),

  validFrom: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .optional(),

  validUntil: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .optional(),
});

export type CreatePickupAuthorizationInput = z.infer<
  typeof createPickupAuthorizationSchema
>;

// ────────────────────────────────────────────────────────────
// Update Pickup Authorization
// ────────────────────────────────────────────────────────────

export const updatePickupAuthorizationSchema = z.object({
  authorizedName: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(200)
    .optional(),

  relationship: z.string().trim().max(100).optional(),

  phone: z.string().trim().max(30).optional(),

  photoUrl: z.string().url("Invalid photo URL").max(2000).optional(),

  isPermanent: z.boolean().optional(),

  validFrom: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  validUntil: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),
});

export type UpdatePickupAuthorizationInput = z.infer<
  typeof updatePickupAuthorizationSchema
>;
