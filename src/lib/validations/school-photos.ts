// src/lib/validations/school-photos.ts
//
// ============================================================
// WattleOS V2 - School Photos Validation Schemas (Module R)
// ============================================================

import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────

const photoSessionStatuses = ["open", "closed", "archived"] as const;
const personTypes = ["student", "staff", "both"] as const;
const photoPersonTypes = ["student", "staff"] as const;
const cardOrientations = ["portrait", "landscape"] as const;

// ── Session Schemas ──────────────────────────────────────────

export const createSessionSchema = z.object({
  name: z.string().trim().min(1, "Session name is required").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  session_date: z.string().date("Enter a valid date (YYYY-MM-DD)"),
  person_type: z.enum(personTypes),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  status: z.enum(photoSessionStatuses).optional(),
});
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

// ── Photo Upload Schemas ─────────────────────────────────────

export const registerPhotoSchema = z.object({
  session_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  person_type: z.enum(photoPersonTypes),
  person_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  storage_path: z.string().min(1),
  photo_url: z.string().url(),
  original_filename: z
    .string()
    .nullish()
    .transform((v) => v || null),
  file_size_bytes: z.number().int().positive().optional(),
  set_as_current: z.boolean().optional(),
});
export type RegisterPhotoInput = z.infer<typeof registerPhotoSchema>;

export const bulkMatchSchema = z.object({
  session_id: z.string().uuid(),
  matches: z.array(
    z.object({
      photo_id: z.string().uuid(),
      person_id: z.string().uuid(),
      person_type: z.enum(photoPersonTypes),
    }),
  ),
  set_as_current: z.boolean().default(true),
});
export type BulkMatchInput = z.infer<typeof bulkMatchSchema>;

export const setCurrentPhotoSchema = z.object({
  photo_id: z.string().uuid(),
});
export type SetCurrentPhotoInput = z.infer<typeof setCurrentPhotoSchema>;

export const cropPhotoSchema = z.object({
  photo_id: z.string().uuid(),
  crop_data: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    rotation: z.number().min(0).max(360),
  }),
});
export type CropPhotoInput = z.infer<typeof cropPhotoSchema>;

// ── ID Card Templates ────────────────────────────────────────

export const idCardTemplateConfigSchema = z.object({
  show_logo: z.boolean(),
  show_class: z.boolean(),
  show_year: z.boolean(),
  show_qr_code: z.boolean(),
  show_barcode: z.boolean(),
  card_orientation: z.enum(cardOrientations),
  primary_color: z.string().min(1),
  secondary_color: z.string().min(1),
  font_size_name: z.number().min(8).max(32),
  font_size_class: z.number().min(6).max(24),
});

export const saveIdCardTemplateSchema = z.object({
  id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  name: z.string().trim().min(1, "Template name is required").max(200),
  person_type: z.enum(photoPersonTypes),
  template_config: idCardTemplateConfigSchema,
  is_default: z.boolean().default(false),
});
export type SaveIdCardTemplateInput = z.infer<
  typeof saveIdCardTemplateSchema
>;

export const generateIdCardsSchema = z.object({
  template_id: z.string().uuid(),
  person_ids: z
    .array(z.string().uuid())
    .min(1, "Select at least one person"),
  year: z.string().optional(),
});
export type GenerateIdCardsInput = z.infer<typeof generateIdCardsSchema>;

// ── Filters ──────────────────────────────────────────────────

export const listPhotosFilterSchema = z.object({
  session_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  person_type: z
    .enum(photoPersonTypes)
    .nullish()
    .transform((v) => v || null),
  has_photo: z.boolean().nullish(),
  class_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  search: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListPhotosFilter = z.infer<typeof listPhotosFilterSchema>;
