// src/lib/validations/ilp.ts
//
// ============================================================
// WattleOS V2 - Individual Learning Plan Validations (Module Q)
// ============================================================

import { z } from "zod";

// ── Enum Arrays ──────────────────────────────────────────────

const planStatuses = [
  "draft",
  "active",
  "in_review",
  "completed",
  "archived",
] as const;

const goalStatuses = [
  "not_started",
  "in_progress",
  "achieved",
  "modified",
  "discontinued",
] as const;

const goalPriorities = ["high", "medium", "low"] as const;

const developmentalDomains = [
  "communication",
  "social_emotional",
  "cognitive",
  "physical",
  "self_help",
  "play",
  "behaviour",
  "sensory",
  "fine_motor",
  "gross_motor",
  "literacy",
  "numeracy",
  "other",
] as const;

const supportCategories = [
  "speech_language",
  "occupational_therapy",
  "physiotherapy",
  "behavioural",
  "autism_spectrum",
  "intellectual",
  "sensory",
  "physical",
  "medical",
  "gifted",
  "english_additional_language",
  "social_emotional",
  "other",
] as const;

const fundingSources = [
  "inclusion_support_programme",
  "ndis",
  "state_disability",
  "school_funded",
  "none",
  "other",
] as const;

const strategyTypes = [
  "environmental",
  "instructional",
  "behavioural",
  "therapeutic",
  "assistive_technology",
  "social",
  "communication",
  "sensory",
  "other",
] as const;

const collaboratorRoles = [
  "speech_pathologist",
  "occupational_therapist",
  "physiotherapist",
  "psychologist",
  "behavioural_therapist",
  "paediatrician",
  "special_educator",
  "social_worker",
  "parent",
  "guardian",
  "lead_educator",
  "coordinator",
  "other",
] as const;

const reviewTypes = [
  "scheduled",
  "interim",
  "transition",
  "annual",
  "parent_requested",
] as const;

const progressRatings = [
  "significant_progress",
  "progressing",
  "minimal_progress",
  "regression",
  "maintaining",
] as const;

const evidenceTypes = [
  "observation",
  "photo",
  "document",
  "assessment_result",
  "allied_health_report",
  "work_sample",
  "video",
  "other",
] as const;

const transitionStatuses = [
  "draft",
  "in_progress",
  "ready_for_family",
  "shared_with_school",
  "completed",
] as const;

// ── Create Plan ──────────────────────────────────────────────

export const createPlanSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  plan_title: z
    .string()
    .trim()
    .min(1, "Plan title is required")
    .max(200, "Must be under 200 characters"),
  support_categories: z
    .array(z.enum(supportCategories))
    .min(1, "Select at least one support category"),
  funding_source: z
    .enum(fundingSources)
    .nullish()
    .transform((v) => v || null),
  funding_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  start_date: z.string().min(1, "Start date is required"),
  review_due_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  child_strengths: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  child_interests: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  background_information: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  family_goals: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  parent_consent_given: z.boolean().default(false),
  parent_consent_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  parent_consent_by: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type CreatePlanRawInput = z.input<typeof createPlanSchema>;

// ── Update Plan ──────────────────────────────────────────────

export const updatePlanSchema = z.object({
  plan_title: z.string().trim().min(1).max(200).optional(),
  plan_status: z.enum(planStatuses).optional(),
  support_categories: z.array(z.enum(supportCategories)).optional(),
  funding_source: z
    .enum(fundingSources)
    .nullish()
    .transform((v) => v || null),
  funding_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  start_date: z.string().optional(),
  review_due_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  next_review_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  end_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  child_strengths: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  child_interests: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  background_information: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  family_goals: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  parent_consent_given: z.boolean().optional(),
  parent_consent_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  parent_consent_by: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type UpdatePlanRawInput = z.input<typeof updatePlanSchema>;

// ── Create Goal ──────────────────────────────────────────────

export const createGoalSchema = z.object({
  plan_id: z.string().uuid(),
  goal_title: z.string().trim().min(1, "Goal title is required").max(300),
  goal_description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  developmental_domain: z.enum(developmentalDomains, {
    message: "Select a developmental domain",
  }),
  eylf_outcome_ids: z.array(z.string()).default([]),
  priority: z.enum(goalPriorities).default("medium"),
  target_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  baseline_notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  success_criteria: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateGoalRawInput = z.input<typeof createGoalSchema>;

// ── Update Goal ──────────────────────────────────────────────

export const updateGoalSchema = z.object({
  goal_title: z.string().trim().min(1).max(300).optional(),
  goal_description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  developmental_domain: z.enum(developmentalDomains).optional(),
  eylf_outcome_ids: z.array(z.string()).optional(),
  goal_status: z.enum(goalStatuses).optional(),
  priority: z.enum(goalPriorities).optional(),
  target_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  baseline_notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  success_criteria: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UpdateGoalRawInput = z.input<typeof updateGoalSchema>;

// ── Create Strategy ──────────────────────────────────────────

export const createStrategySchema = z.object({
  goal_id: z.string().uuid(),
  strategy_description: z
    .string()
    .trim()
    .min(1, "Strategy description is required")
    .max(2000),
  strategy_type: z.enum(strategyTypes).default("environmental"),
  responsible_role: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  responsible_user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  implementation_frequency: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type CreateStrategyRawInput = z.input<typeof createStrategySchema>;

// ── Update Strategy ──────────────────────────────────────────

export const updateStrategySchema = z.object({
  strategy_description: z.string().trim().min(1).max(2000).optional(),
  strategy_type: z.enum(strategyTypes).optional(),
  responsible_role: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  responsible_user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  implementation_frequency: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  is_active: z.boolean().optional(),
});

export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type UpdateStrategyRawInput = z.input<typeof updateStrategySchema>;

// ── Create Review ────────────────────────────────────────────

export const createReviewSchema = z.object({
  plan_id: z.string().uuid(),
  review_type: z.enum(reviewTypes).default("scheduled"),
  review_date: z.string().min(1, "Review date is required"),
  attendees: z.array(z.string()).default([]),
  parent_attended: z.boolean().default(false),
  overall_progress: z.enum(progressRatings, {
    message: "Rate the overall progress",
  }),
  summary_notes: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  family_feedback: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  next_steps: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  goal_updates: z
    .array(
      z.object({
        goal_id: z.string().uuid(),
        progress_rating: z.enum(progressRatings),
        notes: z.string().trim().max(1000).default(""),
      }),
    )
    .default([]),
  new_review_due_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateReviewRawInput = z.input<typeof createReviewSchema>;

// ── Add Collaborator ─────────────────────────────────────────

export const addCollaboratorSchema = z.object({
  plan_id: z.string().uuid(),
  collaborator_name: z.string().trim().min(1, "Name is required").max(200),
  collaborator_role: z.enum(collaboratorRoles, { message: "Select a role" }),
  organisation: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  email: z
    .string()
    .email("Enter a valid email")
    .nullish()
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),
  user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
export type AddCollaboratorRawInput = z.input<typeof addCollaboratorSchema>;

// ── Update Collaborator ──────────────────────────────────────

export const updateCollaboratorSchema = z.object({
  collaborator_name: z.string().trim().min(1).max(200).optional(),
  collaborator_role: z.enum(collaboratorRoles).optional(),
  organisation: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  email: z
    .string()
    .email()
    .nullish()
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),
  user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  is_active: z.boolean().optional(),
});

export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
export type UpdateCollaboratorRawInput = z.input<
  typeof updateCollaboratorSchema
>;

// ── Attach Evidence ──────────────────────────────────────────

export const attachEvidenceSchema = z.object({
  plan_id: z.string().uuid(),
  goal_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  review_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  evidence_type: z.enum(evidenceTypes, { message: "Select evidence type" }),
  observation_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
  file_url: z
    .string()
    .url()
    .nullish()
    .transform((v) => v || null),
  file_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export type AttachEvidenceInput = z.infer<typeof attachEvidenceSchema>;
export type AttachEvidenceRawInput = z.input<typeof attachEvidenceSchema>;

// ── Create Transition Statement ──────────────────────────────

export const createTransitionStatementSchema = z.object({
  student_id: z.string().uuid("Select a student"),
  plan_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  statement_year: z.number().int().min(2020).max(2100),
  identity_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  community_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  wellbeing_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  learning_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  communication_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  strengths_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  interests_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  approaches_to_learning: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  additional_needs_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  family_input: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  educator_recommendations: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  receiving_school_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  receiving_school_contact: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export type CreateTransitionStatementInput = z.infer<
  typeof createTransitionStatementSchema
>;
export type CreateTransitionStatementRawInput = z.input<
  typeof createTransitionStatementSchema
>;

// ── Update Transition Statement ──────────────────────────────

export const updateTransitionStatementSchema = z.object({
  transition_status: z.enum(transitionStatuses).optional(),
  plan_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  identity_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  community_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  wellbeing_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  learning_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  communication_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  strengths_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  interests_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  approaches_to_learning: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  additional_needs_summary: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  family_input: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  educator_recommendations: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
  receiving_school_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  receiving_school_contact: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateTransitionStatementInput = z.infer<
  typeof updateTransitionStatementSchema
>;
export type UpdateTransitionStatementRawInput = z.input<
  typeof updateTransitionStatementSchema
>;

// ── List Filter ──────────────────────────────────────────────

export const listPlansFilterSchema = z.object({
  plan_status: z.enum(planStatuses).nullish(),
  student_id: z.string().uuid().nullish(),
  support_category: z.enum(supportCategories).nullish(),
  review_overdue: z.boolean().nullish(),
});

export type ListPlansFilter = z.infer<typeof listPlansFilterSchema>;
