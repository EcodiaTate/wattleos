// src/lib/validations/nccd.ts
//
// ============================================================
// WattleOS - NCCD Disability Register Zod Schemas
// ============================================================

import { z } from "zod";

const DISABILITY_CATEGORIES = [
  "physical",
  "cognitive",
  "sensory_hearing",
  "sensory_vision",
  "social_emotional",
] as const;

const ADJUSTMENT_LEVELS = [
  "qdtp",
  "supplementary",
  "substantial",
  "extensive",
] as const;

const ADJUSTMENT_TYPES = [
  "curriculum",
  "environment",
  "instruction",
  "assessment",
] as const;

const FUNDING_SOURCES = [
  "inclusion_support_programme",
  "ndis",
  "state_disability",
  "school_funded",
  "none",
  "other",
] as const;

const STATUSES = ["active", "under_review", "exited", "archived"] as const;

const EVIDENCE_TYPES = [
  "professional_report",
  "school_assessment",
  "classroom_observation",
  "parent_report",
  "medical_certificate",
  "ndis_plan",
  "naplan_results",
  "work_sample",
  "other",
] as const;

// ── Create / Update Entry ─────────────────────────────────────

export const createNccdEntrySchema = z.object({
  student_id: z.string().uuid(),
  collection_year: z
    .number()
    .int()
    .min(2020)
    .max(new Date().getFullYear() + 1),

  disability_category: z.enum(DISABILITY_CATEGORIES),
  disability_subcategory: z.string().max(200).optional().nullable(),

  adjustment_level: z.enum(ADJUSTMENT_LEVELS),
  adjustment_types: z
    .array(z.enum(ADJUSTMENT_TYPES))
    .min(1, "At least one adjustment type is required"),

  funding_source: z.enum(FUNDING_SOURCES).optional().nullable(),
  funding_reference: z.string().max(100).optional().nullable(),
  funding_amount: z.number().min(0).optional().nullable(),

  professional_opinion: z.boolean().default(false),
  professional_name: z.string().max(200).optional().nullable(),
  professional_title: z.string().max(200).optional().nullable(),
  professional_date: z.string().optional().nullable(), // ISO date string

  parental_consent_given: z.boolean().default(false),
  parental_consent_date: z.string().optional().nullable(),

  ilp_id: z.string().uuid().optional().nullable(),

  status: z.enum(STATUSES).default("active"),
  notes: z.string().max(2000).optional().nullable(),
  review_due_date: z.string().optional().nullable(),
});

export const updateNccdEntrySchema = createNccdEntrySchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateNccdEntryInput = z.infer<typeof createNccdEntrySchema>;
export type UpdateNccdEntryInput = z.infer<typeof updateNccdEntrySchema>;

// ── Submit to Collection ──────────────────────────────────────

export const submitNccdCollectionSchema = z.object({
  entry_ids: z.array(z.string().uuid()).min(1),
  collection_year: z.number().int().min(2020),
});

export type SubmitNccdCollectionInput = z.infer<
  typeof submitNccdCollectionSchema
>;

// ── Evidence ──────────────────────────────────────────────────

export const addNccdEvidenceSchema = z.object({
  entry_id: z.string().uuid(),
  evidence_type: z.enum(EVIDENCE_TYPES),
  description: z.string().min(1).max(1000),
  observation_id: z.string().uuid().optional().nullable(),
  ilp_evidence_id: z.string().uuid().optional().nullable(),
  document_url: z.string().url().optional().nullable(),
  document_name: z.string().max(200).optional().nullable(),
  evidence_date: z.string().optional().nullable(),
});

export type AddNccdEvidenceInput = z.infer<typeof addNccdEvidenceSchema>;

// ── Filter / List ─────────────────────────────────────────────

export const listNccdEntriesSchema = z.object({
  collection_year: z.number().int().optional(),
  disability_category: z.enum(DISABILITY_CATEGORIES).optional(),
  adjustment_level: z.enum(ADJUSTMENT_LEVELS).optional(),
  status: z.enum(STATUSES).optional(),
  submitted: z.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type ListNccdEntriesInput = z.infer<typeof listNccdEntriesSchema>;
