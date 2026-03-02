// src/lib/validations/visitor-log.ts
//
// ============================================================
// WattleOS V2 - Visitor & Contractor Sign-In Validations
// ============================================================

import { z } from "zod";

// ── Shared ──────────────────────────────────────────────────

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ── Visitor: Create ─────────────────────────────────────────

export const CreateVisitorSchema = z.object({
  visitor_name: z.string().min(1, "Name is required").max(150),
  visitor_type: z.enum([
    "parent_guardian",
    "community_member",
    "official",
    "delivery",
    "volunteer",
    "other",
  ]),
  organisation: z.string().max(150).nullable().optional(),
  purpose: z.string().min(1, "Purpose is required").max(300),
  host_name: z.string().max(150).nullable().optional(),
  badge_number: z.string().max(30).nullable().optional(),
  id_sighted: z.boolean().default(false),
  signed_in_at: z.string().datetime("Must be a valid ISO timestamp"),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateVisitorInput = z.infer<typeof CreateVisitorSchema>;

// ── Visitor: Sign-Out ───────────────────────────────────────

export const SignOutVisitorSchema = z.object({
  id: z.string().uuid("Invalid record ID"),
  signed_out_at: z.string().datetime("Must be a valid ISO timestamp"),
});

export type SignOutVisitorInput = z.infer<typeof SignOutVisitorSchema>;

// ── Visitor: Update ─────────────────────────────────────────

export const UpdateVisitorSchema = z.object({
  id: z.string().uuid("Invalid record ID"),
  visitor_name: z.string().min(1).max(150).optional(),
  visitor_type: z
    .enum([
      "parent_guardian",
      "community_member",
      "official",
      "delivery",
      "volunteer",
      "other",
    ])
    .optional(),
  organisation: z.string().max(150).nullable().optional(),
  purpose: z.string().min(1).max(300).optional(),
  host_name: z.string().max(150).nullable().optional(),
  badge_number: z.string().max(30).nullable().optional(),
  id_sighted: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type UpdateVisitorInput = z.infer<typeof UpdateVisitorSchema>;

// ── Visitor: List / Filter ──────────────────────────────────

export const ListVisitorsSchema = z.object({
  startDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  visitor_type: z
    .enum([
      "parent_guardian",
      "community_member",
      "official",
      "delivery",
      "volunteer",
      "other",
    ])
    .optional(),
  on_site_only: z.boolean().optional().default(false),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(200).optional().default(50),
});

export type ListVisitorsInput = z.infer<typeof ListVisitorsSchema>;

// ── Contractor: Create ──────────────────────────────────────

export const CreateContractorSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(150),
  contact_name: z.string().min(1, "Contact name is required").max(150),
  trade: z.string().max(100).nullable().optional(),
  licence_number: z.string().max(60).nullable().optional(),
  insurance_number: z.string().max(60).nullable().optional(),
  insurance_expiry: z
    .string()
    .regex(dateRegex, "Date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  induction_confirmed: z.boolean().default(false),
  wwcc_number: z.string().max(30).nullable().optional(),
  wwcc_verified: z.boolean().default(false),
  work_location: z.string().min(1, "Work location is required").max(200),
  work_description: z.string().max(300).nullable().optional(),
  signed_in_at: z.string().datetime("Must be a valid ISO timestamp"),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateContractorInput = z.infer<typeof CreateContractorSchema>;

// ── Contractor: Sign-Out ────────────────────────────────────

export const SignOutContractorSchema = z.object({
  id: z.string().uuid("Invalid record ID"),
  signed_out_at: z.string().datetime("Must be a valid ISO timestamp"),
});

export type SignOutContractorInput = z.infer<typeof SignOutContractorSchema>;

// ── Contractor: Update ──────────────────────────────────────

export const UpdateContractorSchema = z.object({
  id: z.string().uuid("Invalid record ID"),
  company_name: z.string().min(1).max(150).optional(),
  contact_name: z.string().min(1).max(150).optional(),
  trade: z.string().max(100).nullable().optional(),
  licence_number: z.string().max(60).nullable().optional(),
  insurance_number: z.string().max(60).nullable().optional(),
  insurance_expiry: z.string().regex(dateRegex).nullable().optional(),
  induction_confirmed: z.boolean().optional(),
  wwcc_number: z.string().max(30).nullable().optional(),
  wwcc_verified: z.boolean().optional(),
  work_location: z.string().min(1).max(200).optional(),
  work_description: z.string().max(300).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type UpdateContractorInput = z.infer<typeof UpdateContractorSchema>;

// ── Contractor: List / Filter ───────────────────────────────

export const ListContractorsSchema = z.object({
  startDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  on_site_only: z.boolean().optional().default(false),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(200).optional().default(50),
});

export type ListContractorsInput = z.infer<typeof ListContractorsSchema>;
