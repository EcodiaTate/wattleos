// src/lib/validations/admissions.ts
//
// ============================================================
// Zod Schemas — Admissions / Waitlist Pipeline
// ============================================================
// Runtime validation for all admissions-related inputs.
// Public endpoints (submitInquiry, bookTour) are the highest
// priority because they accept untrusted external data.
//
// PATTERN:
//   1. Define schema with z.object({ ... })
//   2. Export the schema AND the inferred TypeScript type
//   3. In the action, call schema.safeParse(input)
//   4. If it fails, return failure() with the first issue message
//   5. If it passes, use parsed.data — it's fully typed and cleaned
//
// WHY z.string().trim(): Zod can transform data during parsing.
// .trim() strips whitespace BEFORE validation, so " " fails
// a .min(1) check. Your current manual code does input.field?.trim()
// in 20+ places — Zod handles it once in the schema.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Submit Inquiry (Public — no auth)
// ────────────────────────────────────────────────────────────

export const submitInquirySchema = z.object({
  // Required: which school this inquiry is for
  tenant_id: z
    .string("School identifier is required")
    .uuid("Invalid school identifier"),

  // ── Parent details ──────────────────────────────────────
  parent_first_name: z
    .string()
    .trim()
    .min(1, "Parent first name is required")
    .max(100, "Parent first name is too long"),

  parent_last_name: z
    .string()
    .trim()
    .min(1, "Parent last name is required")
    .max(100, "Parent last name is too long"),

  parent_email: z
    .string()
    .trim()
    .min(1, "Parent email is required")
    .email("Please enter a valid email address")
    .max(254, "Email is too long")
    .transform((v) => v.toLowerCase()),

  parent_phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .nullish()
    .transform((v) => v || null),

  // ── Child details ───────────────────────────────────────
  child_first_name: z
    .string()
    .trim()
    .min(1, "Child first name is required")
    .max(100, "Child first name is too long"),

  child_last_name: z
    .string()
    .trim()
    .min(1, "Child last name is required")
    .max(100, "Child last name is too long"),

  child_date_of_birth: z
    .string("Child date of birth is required")
    .date("Please enter a valid date (YYYY-MM-DD)"),

  child_gender: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),

  child_current_school: z
    .string()
    .trim()
    .max(200, "School name is too long")
    .nullish()
    .transform((v) => v || null),

  // ── Program preferences ─────────────────────────────────
  requested_program: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v || null),

  requested_start: z
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

  // ── Additional info ─────────────────────────────────────
  siblings_at_school: z
    .boolean()
    .optional()
    .default(false),

  sibling_names: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),

  how_heard_about_us: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .nullish()
    .transform((v) => v || null),

  // ── Tracking (set by the page, not the user) ────────────
  source_url: z.string().url().max(2000).nullish().transform((v) => v || null),
  source_campaign: z.string().max(200).nullish().transform((v) => v || null),
});

// Inferred TypeScript type — use this instead of the manual interface
export type SubmitInquiryInput = z.infer<typeof submitInquirySchema>;

// ────────────────────────────────────────────────────────────
// Book Tour (Public — no auth)
// ────────────────────────────────────────────────────────────

export const bookTourSchema = z.object({
  tenant_id: z
    .string("School identifier is required")
    .uuid("Invalid school identifier"),

  tour_slot_id: z
    .string("Tour slot is required")
    .uuid("Invalid tour slot"),

  parent_first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100),

  parent_last_name: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100),

  parent_email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email")
    .max(254)
    .transform((v) => v.toLowerCase()),

  parent_phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),

  child_name: z
    .string()
    .trim()
    .min(1, "Child name is required")
    .max(200),

  child_age: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),

  // Link to existing waitlist entry if applicable
  waitlist_entry_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type BookTourInput = z.infer<typeof bookTourSchema>;