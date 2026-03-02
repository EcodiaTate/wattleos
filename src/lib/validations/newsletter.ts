// src/lib/validations/newsletter.ts
//
// ============================================================
// Newsletter Module - Zod Validation Schemas
// ============================================================

import { z } from "zod";

const NEWSLETTER_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
] as const;

const NEWSLETTER_AUDIENCES = [
  "all_parents",
  "all_staff",
  "all_users",
  "class",
  "program",
] as const;

const NEWSLETTER_SECTION_TYPES = [
  "heading",
  "text",
  "image",
  "divider",
  "button",
  "two_column",
] as const;

// ============================================================
// Newsletter Template
// ============================================================

export const CreateNewsletterTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(200),
  description: z.string().max(500).nullish(),
  body_json: z.array(z.record(z.string(), z.unknown())).default([]),
  header_image_url: z.string().url().nullish(),
  footer_html: z.string().max(5000).nullish(),
});

export type CreateNewsletterTemplateInput = z.infer<
  typeof CreateNewsletterTemplateSchema
>;

export const UpdateNewsletterTemplateSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullish(),
  body_json: z.array(z.record(z.string(), z.unknown())).optional(),
  header_image_url: z.string().url().nullish(),
  footer_html: z.string().max(5000).nullish(),
});

export type UpdateNewsletterTemplateInput = z.infer<
  typeof UpdateNewsletterTemplateSchema
>;

// ============================================================
// Newsletter (Edition)
// ============================================================

export const CreateNewsletterSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(300),
    subject_line: z.string().min(1, "Subject line is required").max(200),
    preheader: z.string().max(200).nullish(),
    body_html: z.string().default(""),
    body_json: z.array(z.record(z.string(), z.unknown())).default([]),
    header_image_url: z.string().url().nullish(),
    footer_html: z.string().max(5000).nullish(),
    template_id: z.string().uuid().nullish(),
    audience: z.enum(NEWSLETTER_AUDIENCES),
    target_class_id: z.string().uuid().nullish(),
    target_program_id: z.string().uuid().nullish(),
    scheduled_for: z.string().datetime().nullish(),
  })
  .refine(
    (v) => {
      if (v.audience === "class") return !!v.target_class_id;
      if (v.audience === "program") return !!v.target_program_id;
      return true;
    },
    {
      message:
        "A target class or program is required for the selected audience",
    },
  );

export type CreateNewsletterInput = z.infer<typeof CreateNewsletterSchema>;

export const UpdateNewsletterSchema = z.object({
  newsletter_id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  subject_line: z.string().min(1).max(200).optional(),
  preheader: z.string().max(200).nullish(),
  body_html: z.string().optional(),
  body_json: z.array(z.record(z.string(), z.unknown())).optional(),
  header_image_url: z.string().url().nullish(),
  footer_html: z.string().max(5000).nullish(),
  audience: z.enum(NEWSLETTER_AUDIENCES).optional(),
  target_class_id: z.string().uuid().nullish(),
  target_program_id: z.string().uuid().nullish(),
  scheduled_for: z.string().datetime().nullish(),
});

export type UpdateNewsletterInput = z.infer<typeof UpdateNewsletterSchema>;

// ============================================================
// Newsletter Section
// ============================================================

export const UpsertNewsletterSectionSchema = z.object({
  id: z.string().uuid().optional(),
  newsletter_id: z.string().uuid(),
  section_type: z.enum(NEWSLETTER_SECTION_TYPES),
  sort_order: z.number().int().min(0),
  content_json: z.record(z.string(), z.unknown()),
});

export type UpsertNewsletterSectionInput = z.infer<
  typeof UpsertNewsletterSectionSchema
>;

export const ReorderSectionsSchema = z.object({
  newsletter_id: z.string().uuid(),
  section_ids: z.array(z.string().uuid()).min(1),
});

export type ReorderSectionsInput = z.infer<typeof ReorderSectionsSchema>;

// ============================================================
// Send / Schedule / Cancel
// ============================================================

export const SendNewsletterSchema = z.object({
  newsletter_id: z.string().uuid(),
});

export type SendNewsletterInput = z.infer<typeof SendNewsletterSchema>;

export const ScheduleNewsletterSchema = z.object({
  newsletter_id: z.string().uuid(),
  scheduled_for: z.string().datetime(),
});

export type ScheduleNewsletterInput = z.infer<typeof ScheduleNewsletterSchema>;

export const CancelNewsletterSchema = z.object({
  newsletter_id: z.string().uuid(),
});

export type CancelNewsletterInput = z.infer<typeof CancelNewsletterSchema>;

// ============================================================
// Read Receipt
// ============================================================

export const RecordReadReceiptSchema = z.object({
  newsletter_id: z.string().uuid(),
});

export type RecordReadReceiptInput = z.infer<typeof RecordReadReceiptSchema>;

// ============================================================
// List / Filter
// ============================================================

export const ListNewslettersSchema = z.object({
  status: z.enum(NEWSLETTER_STATUSES).optional(),
  audience: z.enum(NEWSLETTER_AUDIENCES).optional(),
  include_deleted: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

export type ListNewslettersInput = z.input<typeof ListNewslettersSchema>;

export const ListRecipientsSchema = z.object({
  newsletter_id: z.string().uuid(),
  opened_only: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50),
});

export type ListRecipientsInput = z.input<typeof ListRecipientsSchema>;
