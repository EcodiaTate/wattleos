import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const HubArticleCategorySchema = z.enum([
  "philosophy",
  "language",
  "mathematics",
  "practical_life",
  "sensorial",
  "cultural",
  "cosmic_education",
  "child_development",
  "home_connection",
  "three_period_lesson",
  "sensitive_periods",
  "work_cycle",
  "normalization",
  "prepared_environment",
]);

export const HubArticleAgeBandSchema = z.enum([
  "birth_3",
  "three_6",
  "six_9",
  "nine_12",
  "all_ages",
]);

export const HubArticleStatusSchema = z.enum(["draft", "published", "archived"]);

// ── Create Article ─────────────────────────────────────────────────────────────

export const CreateHubArticleSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  category: HubArticleCategorySchema,
  age_bands: z.array(HubArticleAgeBandSchema).min(1, "Select at least one age band"),
  status: HubArticleStatusSchema.default("draft"),
  summary: z.string().min(10).max(500),
  body_md: z.string().min(20),
  key_takeaways: z.array(z.string().min(5)).max(5).default([]),
  home_tips: z.array(z.string().min(5)).max(8).default([]),
  linked_area_ids: z.array(z.string()).default([]),
  linked_keywords: z.array(z.string()).default([]),
  sort_order: z.number().int().min(0).default(0),
});

export type CreateHubArticleInput = z.infer<typeof CreateHubArticleSchema>;

// ── Update Article ─────────────────────────────────────────────────────────────

export const UpdateHubArticleSchema = CreateHubArticleSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateHubArticleInput = z.infer<typeof UpdateHubArticleSchema>;

// ── List / Filter ──────────────────────────────────────────────────────────────

export const ListHubArticlesSchema = z.object({
  category: HubArticleCategorySchema.optional(),
  age_band: HubArticleAgeBandSchema.optional(),
  status: HubArticleStatusSchema.optional(),
  include_platform: z.boolean().default(true),
  search: z.string().max(200).optional(),
  bookmarked_only: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20),
});

export type ListHubArticlesFilter = z.input<typeof ListHubArticlesSchema>;

// ── Mark Read / Bookmark ───────────────────────────────────────────────────────

export const MarkHubArticleReadSchema = z.object({
  article_id: z.string().uuid(),
  bookmarked: z.boolean().optional(),
});

export type MarkHubArticleReadInput = z.infer<typeof MarkHubArticleReadSchema>;

// ── Toggle Bookmark ────────────────────────────────────────────────────────────

export const ToggleHubBookmarkSchema = z.object({
  article_id: z.string().uuid(),
  bookmarked: z.boolean(),
});

export type ToggleHubBookmarkInput = z.infer<typeof ToggleHubBookmarkSchema>;

// ── Submit Feedback ────────────────────────────────────────────────────────────

export const SubmitHubFeedbackSchema = z.object({
  article_id: z.string().uuid(),
  helpful: z.boolean(),
});

export type SubmitHubFeedbackInput = z.infer<typeof SubmitHubFeedbackSchema>;
