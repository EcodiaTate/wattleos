// src/lib/validations/cosmic-education.ts
//
// ============================================================
// Cosmic Education Unit Planning - Zod Schemas
// ============================================================

import { z } from "zod";

// ============================================================
// Shared enums
// ============================================================

const CosmicGreatLessonSchema = z.enum([
  "story_of_universe",
  "story_of_life",
  "story_of_humans",
  "story_of_communication",
  "story_of_numbers",
  "custom",
]);

const CosmicUnitStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "archived",
]);

const CosmicStudyAreaSchema = z.enum([
  "history",
  "geography",
  "biology",
  "physics",
  "astronomy",
  "mathematics",
  "language_arts",
  "art_music",
  "culture_society",
  "economics",
  "integrated",
]);

const CosmicStudyStatusSchema = z.enum([
  "introduced",
  "exploring",
  "presenting",
  "completed",
]);

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ============================================================
// Great Lesson - Create custom
// ============================================================

export const CreateCustomGreatLessonSchema = z.object({
  lesson_key: z.literal("custom"),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(300).nullish(),
  description: z.string().max(4000).nullish(),
  age_range: z.string().min(1).max(20).optional(),
  related_areas: z.array(CosmicStudyAreaSchema).min(1),
  display_order: z.number().int().min(0).max(99).optional(),
});

export type CreateCustomGreatLessonInput = z.infer<
  typeof CreateCustomGreatLessonSchema
>;

// ============================================================
// Cosmic Unit - Create
// ============================================================

export const CreateCosmicUnitSchema = z.object({
  great_lesson_id: z.string().uuid(),
  title: z.string().min(1).max(400),
  description: z.string().max(6000).nullish(),
  key_questions: z.array(z.string().min(1).max(500)).max(10).optional(),
  age_range: z.string().min(1).max(20).optional(),
  planned_start: DateStringSchema.nullish(),
  planned_end: DateStringSchema.nullish(),
  lead_staff_id: z.string().uuid().nullish(),
  target_class_id: z.string().uuid().nullish(),
  linked_material_ids: z.array(z.string().uuid()).optional(),
  linked_lesson_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(4000).nullish(),
});

export type CreateCosmicUnitInput = z.infer<typeof CreateCosmicUnitSchema>;

// ============================================================
// Cosmic Unit - Update
// ============================================================

export const UpdateCosmicUnitSchema = z.object({
  title: z.string().min(1).max(400).optional(),
  description: z.string().max(6000).nullish(),
  key_questions: z.array(z.string().min(1).max(500)).max(10).nullish(),
  age_range: z.string().min(1).max(20).optional(),
  status: CosmicUnitStatusSchema.optional(),
  planned_start: DateStringSchema.nullish(),
  planned_end: DateStringSchema.nullish(),
  actual_start: DateStringSchema.nullish(),
  actual_end: DateStringSchema.nullish(),
  lead_staff_id: z.string().uuid().nullish(),
  target_class_id: z.string().uuid().nullish(),
  linked_material_ids: z.array(z.string().uuid()).nullish(),
  linked_lesson_ids: z.array(z.string().uuid()).nullish(),
  notes: z.string().max(4000).nullish(),
});

export type UpdateCosmicUnitInput = z.infer<typeof UpdateCosmicUnitSchema>;

// ============================================================
// Unit list filter
// ============================================================

export const ListCosmicUnitsSchema = z.object({
  status: CosmicUnitStatusSchema.nullish(),
  great_lesson_id: z.string().uuid().nullish(),
  lesson_key: CosmicGreatLessonSchema.nullish(),
  target_class_id: z.string().uuid().nullish(),
});

export type ListCosmicUnitsInput = z.input<typeof ListCosmicUnitsSchema>;

// ============================================================
// Cosmic Unit Study - Create
// ============================================================

export const CreateCosmicUnitStudySchema = z.object({
  unit_id: z.string().uuid(),
  title: z.string().min(1).max(400),
  study_area: CosmicStudyAreaSchema,
  description: z.string().max(4000).nullish(),
  learning_outcomes: z.array(z.string().min(1).max(500)).max(20).optional(),
  key_vocabulary: z.array(z.string().min(1).max(100)).max(50).optional(),
  materials_needed: z.array(z.string().min(1).max(300)).max(30).optional(),
  resources: z.array(z.string().min(1).max(1000)).max(20).optional(),
  display_order: z.number().int().min(0).max(99).optional(),
});

export type CreateCosmicUnitStudyInput = z.infer<
  typeof CreateCosmicUnitStudySchema
>;

// ============================================================
// Cosmic Unit Study - Update
// ============================================================

export const UpdateCosmicUnitStudySchema = z.object({
  title: z.string().min(1).max(400).optional(),
  study_area: CosmicStudyAreaSchema.optional(),
  description: z.string().max(4000).nullish(),
  learning_outcomes: z.array(z.string().min(1).max(500)).max(20).nullish(),
  key_vocabulary: z.array(z.string().min(1).max(100)).max(50).nullish(),
  materials_needed: z.array(z.string().min(1).max(300)).max(30).nullish(),
  resources: z.array(z.string().min(1).max(1000)).max(20).nullish(),
  display_order: z.number().int().min(0).max(99).optional(),
});

export type UpdateCosmicUnitStudyInput = z.infer<
  typeof UpdateCosmicUnitStudySchema
>;

// ============================================================
// Participants - Seed from class / add individually
// ============================================================

export const AddCosmicParticipantsSchema = z.object({
  unit_id: z.string().uuid(),
  student_ids: z.array(z.string().uuid()).min(1).max(200),
  notes: z.string().max(1000).nullish(),
});

export type AddCosmicParticipantsInput = z.infer<
  typeof AddCosmicParticipantsSchema
>;

// ============================================================
// Study Record - Upsert (one row per study × student)
// ============================================================

export const UpsertCosmicStudyRecordSchema = z.object({
  unit_id: z.string().uuid(),
  study_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: CosmicStudyStatusSchema,
  introduced_at: DateStringSchema.nullish(),
  exploring_at: DateStringSchema.nullish(),
  presenting_at: DateStringSchema.nullish(),
  completed_at: DateStringSchema.nullish(),
  presentation_notes: z.string().max(4000).nullish(),
  staff_notes: z.string().max(4000).nullish(),
});

export type UpsertCosmicStudyRecordInput = z.infer<
  typeof UpsertCosmicStudyRecordSchema
>;

// ============================================================
// Bulk status update (advance multiple students at once)
// ============================================================

export const BulkUpdateStudyStatusSchema = z.object({
  unit_id: z.string().uuid(),
  study_id: z.string().uuid(),
  student_ids: z.array(z.string().uuid()).min(1).max(200),
  status: CosmicStudyStatusSchema,
});

export type BulkUpdateStudyStatusInput = z.infer<
  typeof BulkUpdateStudyStatusSchema
>;
