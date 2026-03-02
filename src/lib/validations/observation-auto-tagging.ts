// src/lib/validations/observation-auto-tagging.ts
import { z } from "zod";

export const reviewTagSuggestionSchema = z.object({
  suggestion_id: z.string().uuid(),
  status: z.enum(["confirmed", "dismissed"]),
});

export const bulkReviewTagSuggestionsSchema = z.object({
  observation_id: z.string().uuid(),
  reviews: z.array(reviewTagSuggestionSchema).min(1),
});

export const listTagSuggestionsSchema = z.object({
  observation_id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "dismissed"]).optional(),
});

export type ReviewTagSuggestionInput = z.infer<typeof reviewTagSuggestionSchema>;
export type BulkReviewTagSuggestionsInput = z.infer<typeof bulkReviewTagSuggestionsSchema>;
export type ListTagSuggestionsFilter = z.input<typeof listTagSuggestionsSchema>;
