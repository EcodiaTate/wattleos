// src/lib/constants/ilp.ts
//
// ============================================================
// WattleOS V2 - Individual Learning Plan Constants (Module Q)
// ============================================================

import type {
  IlpCollaboratorRole,
  IlpDevelopmentalDomain,
  IlpEvidenceType,
  IlpFundingSource,
  IlpGoalPriority,
  IlpGoalStatus,
  IlpPlanStatus,
  IlpProgressRating,
  IlpReviewType,
  IlpStrategyType,
  IlpSupportCategory,
  TransitionStatementStatus,
} from "@/types/domain";

// ── Status Config Interface ──────────────────────────────────

export interface IlpStatusConfig {
  label: string;
  cssVar: string;
  cssVarFg: string;
}

// ── Plan Status ──────────────────────────────────────────────

export const ILP_PLAN_STATUS_CONFIG: Record<IlpPlanStatus, IlpStatusConfig> = {
  draft: {
    label: "Draft",
    cssVar: "var(--ilp-draft)",
    cssVarFg: "var(--ilp-draft-fg)",
  },
  active: {
    label: "Active",
    cssVar: "var(--ilp-active)",
    cssVarFg: "var(--ilp-active-fg)",
  },
  in_review: {
    label: "In Review",
    cssVar: "var(--ilp-in-review)",
    cssVarFg: "var(--ilp-in-review-fg)",
  },
  completed: {
    label: "Completed",
    cssVar: "var(--ilp-completed)",
    cssVarFg: "var(--ilp-completed-fg)",
  },
  archived: {
    label: "Archived",
    cssVar: "var(--ilp-archived)",
    cssVarFg: "var(--ilp-archived-fg)",
  },
};

// ── Goal Status ──────────────────────────────────────────────

export const ILP_GOAL_STATUS_CONFIG: Record<IlpGoalStatus, IlpStatusConfig> = {
  not_started: {
    label: "Not Started",
    cssVar: "var(--ilp-goal-not-started)",
    cssVarFg: "var(--ilp-goal-not-started-fg)",
  },
  in_progress: {
    label: "In Progress",
    cssVar: "var(--ilp-goal-in-progress)",
    cssVarFg: "var(--ilp-goal-in-progress-fg)",
  },
  achieved: {
    label: "Achieved",
    cssVar: "var(--ilp-goal-achieved)",
    cssVarFg: "var(--ilp-goal-achieved-fg)",
  },
  modified: {
    label: "Modified",
    cssVar: "var(--ilp-goal-modified)",
    cssVarFg: "var(--ilp-goal-modified-fg)",
  },
  discontinued: {
    label: "Discontinued",
    cssVar: "var(--ilp-goal-discontinued)",
    cssVarFg: "var(--ilp-goal-discontinued-fg)",
  },
};

// ── Goal Priority ────────────────────────────────────────────

export interface IlpPriorityConfig {
  label: string;
  emoji: string;
  cssVar: string;
  cssVarFg: string;
}

export const ILP_PRIORITY_CONFIG: Record<IlpGoalPriority, IlpPriorityConfig> = {
  high: {
    label: "High",
    emoji: "🔴",
    cssVar: "var(--ilp-priority-high)",
    cssVarFg: "var(--ilp-priority-high-fg)",
  },
  medium: {
    label: "Medium",
    emoji: "🟡",
    cssVar: "var(--ilp-priority-medium)",
    cssVarFg: "var(--ilp-priority-medium-fg)",
  },
  low: {
    label: "Low",
    emoji: "🟢",
    cssVar: "var(--ilp-priority-low)",
    cssVarFg: "var(--ilp-priority-low-fg)",
  },
};

// ── Developmental Domains ────────────────────────────────────

export interface DomainConfig {
  label: string;
  emoji: string;
}

export const DEVELOPMENTAL_DOMAIN_CONFIG: Record<
  IlpDevelopmentalDomain,
  DomainConfig
> = {
  communication: { label: "Communication", emoji: "💬" },
  social_emotional: { label: "Social & Emotional", emoji: "🤝" },
  cognitive: { label: "Cognitive", emoji: "🧠" },
  physical: { label: "Physical", emoji: "🏃" },
  self_help: { label: "Self-Help / Daily Living", emoji: "🪥" },
  play: { label: "Play", emoji: "🧩" },
  behaviour: { label: "Behaviour", emoji: "🎯" },
  sensory: { label: "Sensory Processing", emoji: "👁" },
  fine_motor: { label: "Fine Motor", emoji: "✏" },
  gross_motor: { label: "Gross Motor", emoji: "⚽" },
  literacy: { label: "Literacy", emoji: "📖" },
  numeracy: { label: "Numeracy", emoji: "🔢" },
  other: { label: "Other", emoji: "📋" },
};

// ── Support Categories ───────────────────────────────────────

export const SUPPORT_CATEGORY_CONFIG: Record<
  IlpSupportCategory,
  { label: string; emoji: string }
> = {
  speech_language: { label: "Speech & Language", emoji: "🗣" },
  occupational_therapy: { label: "Occupational Therapy", emoji: "🤲" },
  physiotherapy: { label: "Physiotherapy", emoji: "🦿" },
  behavioural: { label: "Behavioural Support", emoji: "🎯" },
  autism_spectrum: { label: "Autism Spectrum", emoji: "🧩" },
  intellectual: { label: "Intellectual", emoji: "📚" },
  sensory: { label: "Sensory", emoji: "👁" },
  physical: { label: "Physical", emoji: "♿" },
  medical: { label: "Medical", emoji: "🏥" },
  gifted: { label: "Gifted & Talented", emoji: "⭐" },
  english_additional_language: { label: "EAL/D", emoji: "🌏" },
  social_emotional: { label: "Social-Emotional", emoji: "💛" },
  other: { label: "Other", emoji: "📝" },
};

// ── Funding Sources ──────────────────────────────────────────

export const FUNDING_SOURCE_CONFIG: Record<
  IlpFundingSource,
  { label: string }
> = {
  inclusion_support_programme: { label: "Inclusion Support Programme (ISP)" },
  ndis: { label: "NDIS" },
  state_disability: { label: "State Disability Funding" },
  school_funded: { label: "School Funded" },
  none: { label: "No Funding" },
  other: { label: "Other" },
};

// ── Collaborator Roles ───────────────────────────────────────

export const COLLABORATOR_ROLE_CONFIG: Record<
  IlpCollaboratorRole,
  { label: string }
> = {
  speech_pathologist: { label: "Speech Pathologist" },
  occupational_therapist: { label: "Occupational Therapist" },
  physiotherapist: { label: "Physiotherapist" },
  psychologist: { label: "Psychologist" },
  behavioural_therapist: { label: "Behavioural Therapist" },
  paediatrician: { label: "Paediatrician" },
  special_educator: { label: "Special Educator" },
  social_worker: { label: "Social Worker" },
  parent: { label: "Parent" },
  guardian: { label: "Guardian" },
  lead_educator: { label: "Lead Educator" },
  coordinator: { label: "Coordinator" },
  other: { label: "Other" },
};

// ── Strategy Types ───────────────────────────────────────────

export const STRATEGY_TYPE_CONFIG: Record<IlpStrategyType, { label: string }> =
  {
    environmental: { label: "Environmental Modification" },
    instructional: { label: "Instructional Approach" },
    behavioural: { label: "Behavioural Strategy" },
    therapeutic: { label: "Therapeutic Intervention" },
    assistive_technology: { label: "Assistive Technology" },
    social: { label: "Social Support" },
    communication: { label: "Communication Support" },
    sensory: { label: "Sensory Strategy" },
    other: { label: "Other" },
  };

// ── Review Types ─────────────────────────────────────────────

export const REVIEW_TYPE_CONFIG: Record<
  IlpReviewType,
  { label: string; emoji: string }
> = {
  scheduled: { label: "Scheduled Review", emoji: "📅" },
  interim: { label: "Interim Check-in", emoji: "📊" },
  transition: { label: "Transition Review", emoji: "🎒" },
  annual: { label: "Annual Review", emoji: "📆" },
  parent_requested: { label: "Parent-Requested Review", emoji: "👪" },
};

// ── Progress Ratings ─────────────────────────────────────────

export const PROGRESS_RATING_CONFIG: Record<
  IlpProgressRating,
  IlpStatusConfig
> = {
  significant_progress: {
    label: "Significant Progress",
    cssVar: "var(--ilp-progress-significant)",
    cssVarFg: "var(--ilp-progress-significant-fg)",
  },
  progressing: {
    label: "Progressing",
    cssVar: "var(--ilp-progress-progressing)",
    cssVarFg: "var(--ilp-progress-progressing-fg)",
  },
  minimal_progress: {
    label: "Minimal Progress",
    cssVar: "var(--ilp-progress-minimal)",
    cssVarFg: "var(--ilp-progress-minimal-fg)",
  },
  regression: {
    label: "Regression",
    cssVar: "var(--ilp-progress-regression)",
    cssVarFg: "var(--ilp-progress-regression-fg)",
  },
  maintaining: {
    label: "Maintaining",
    cssVar: "var(--ilp-progress-maintaining)",
    cssVarFg: "var(--ilp-progress-maintaining-fg)",
  },
};

// ── Evidence Types ───────────────────────────────────────────

export const EVIDENCE_TYPE_CONFIG: Record<
  IlpEvidenceType,
  { label: string; emoji: string }
> = {
  observation: { label: "Observation", emoji: "📝" },
  photo: { label: "Photo", emoji: "📸" },
  document: { label: "Document", emoji: "📄" },
  assessment_result: { label: "Assessment Result", emoji: "📊" },
  allied_health_report: { label: "Allied Health Report", emoji: "🏥" },
  work_sample: { label: "Work Sample", emoji: "🎨" },
  video: { label: "Video", emoji: "🎬" },
  other: { label: "Other", emoji: "📎" },
};

// ── Transition Statement Status ──────────────────────────────

export const TRANSITION_STATUS_CONFIG: Record<
  TransitionStatementStatus,
  IlpStatusConfig
> = {
  draft: {
    label: "Draft",
    cssVar: "var(--ilp-draft)",
    cssVarFg: "var(--ilp-draft-fg)",
  },
  in_progress: {
    label: "In Progress",
    cssVar: "var(--ilp-active)",
    cssVarFg: "var(--ilp-active-fg)",
  },
  ready_for_family: {
    label: "Ready for Family",
    cssVar: "var(--ilp-in-review)",
    cssVarFg: "var(--ilp-in-review-fg)",
  },
  shared_with_school: {
    label: "Shared with School",
    cssVar: "var(--ilp-completed)",
    cssVarFg: "var(--ilp-completed-fg)",
  },
  completed: {
    label: "Completed",
    cssVar: "var(--ilp-completed)",
    cssVarFg: "var(--ilp-completed-fg)",
  },
};

// ── Valid Status Transitions ─────────────────────────────────

export const VALID_PLAN_TRANSITIONS: Record<string, string[]> = {
  draft: ["active"],
  active: ["in_review", "completed", "archived"],
  in_review: ["active", "completed"],
  completed: ["archived"],
  archived: [],
};

export const VALID_GOAL_TRANSITIONS: Record<string, string[]> = {
  not_started: ["in_progress", "discontinued"],
  in_progress: ["achieved", "modified", "discontinued"],
  achieved: [],
  modified: ["in_progress", "achieved", "discontinued"],
  discontinued: [],
};

// ── Default Review Cycle ─────────────────────────────────────
// ISP recommends at least quarterly reviews

export const DEFAULT_REVIEW_CYCLE_DAYS = 90;
