// src/lib/plg/plan-gating.ts
//
// ============================================================
// WattleOS V2 - PLG Plan Tier Feature Gating
// ============================================================
// Single source of truth for which features are available on
// each plan tier. Enforcement happens at the Server Action
// layer - never in RLS (which only enforces tenant isolation).
//
// Feature matrix derived from WATTLEOS_PLG_STRATEGY.md.
//
// HOW TO ADD A NEW FEATURE GATE:
//   1. Add to PLGFeature union type
//   2. Add row to FEATURE_MATRIX
//   3. Call isFeatureEnabled() in the relevant server action
//   4. Render UpsellNudge in the relevant client component
// ============================================================

import type { PlanTier } from "@/types/domain";

// ============================================================
// Feature Keys
// ============================================================

export type PLGFeature =
  // ── Module A: Term Reports ──────────────────────────────
  | "report_mastery_summary_section" // mastery_summary section auto-populates
  | "report_observation_highlights" // observation_highlights section
  | "report_attendance_merge_field" // attendance data in merge fields
  | "report_mastery_merge_field" // mastery data in merge fields
  | "report_parent_portal_delivery" // publish reports to parent portal
  | "report_history_unlimited" // unlimited report period history (free = 1)
  // ── Module B: Observations ──────────────────────────────
  | "obs_colleague_visibility" // view other guides' observations
  | "obs_parent_access" // parents see observations via portal
  | "obs_auto_mastery_update" // publishing observation updates mastery
  | "obs_media_unlimited" // unlimited photos/video (free = 5 photos)
  | "obs_sis_student_tagging" // tag students from SIS list vs free-text
  | "obs_structured_outcomes" // tag AMI/EYLF outcomes (vs freeform text)
  // ── Module C: Curriculum & Mastery ─────────────────────
  | "curriculum_class_heatmap" // class-wide mastery heatmap view
  | "curriculum_eylf_mapping" // EYLF cross-mapping + compliance reports
  | "curriculum_obs_link" // link mastery to observations
  | "curriculum_pull_to_reports" // pull mastery into reports auto
  | "curriculum_unlimited_students" // unlimited students (free = 30)
  | "curriculum_multiple_instances" // multiple curriculum instances (free = 1)
  // ── Module D: Admissions ────────────────────────────────
  | "admissions_convert_to_enrollment"; // hard wall at offer → enrollment

// ============================================================
// Feature Matrix
// ============================================================
// true = feature available on this plan tier

type FeatureMatrix = Record<PLGFeature, Record<PlanTier, boolean>>;

const FEATURE_MATRIX: FeatureMatrix = {
  // ── Module A: Term Reports ─────────────────────────────────
  report_mastery_summary_section: { free: false, pro: true, enterprise: true },
  report_observation_highlights: { free: false, pro: true, enterprise: true },
  report_attendance_merge_field: { free: false, pro: true, enterprise: true },
  report_mastery_merge_field: { free: false, pro: true, enterprise: true },
  report_parent_portal_delivery: { free: false, pro: true, enterprise: true },
  report_history_unlimited: { free: false, pro: true, enterprise: true },

  // ── Module B: Observations ─────────────────────────────────
  obs_colleague_visibility: { free: false, pro: true, enterprise: true },
  obs_parent_access: { free: false, pro: true, enterprise: true },
  obs_auto_mastery_update: { free: false, pro: true, enterprise: true },
  obs_media_unlimited: { free: false, pro: true, enterprise: true },
  obs_sis_student_tagging: { free: false, pro: true, enterprise: true },
  obs_structured_outcomes: { free: false, pro: true, enterprise: true },

  // ── Module C: Curriculum & Mastery ─────────────────────────
  curriculum_class_heatmap: { free: false, pro: true, enterprise: true },
  curriculum_eylf_mapping: { free: false, pro: true, enterprise: true },
  curriculum_obs_link: { free: false, pro: true, enterprise: true },
  curriculum_pull_to_reports: { free: false, pro: true, enterprise: true },
  curriculum_unlimited_students: { free: false, pro: true, enterprise: true },
  curriculum_multiple_instances: { free: false, pro: true, enterprise: true },

  // ── Module D: Admissions ───────────────────────────────────
  admissions_convert_to_enrollment: {
    free: false,
    pro: true,
    enterprise: true,
  },
};

// ============================================================
// Usage Limits (count-based)
// ============================================================

export interface PLGUsageLimits {
  report_period_history: number; // max archived periods (Infinity = unlimited)
  observation_media_count: number; // max photos per observation
  curriculum_student_limit: number; // max students in curriculum tracking
  curriculum_instance_limit: number; // max curriculum instances
  // ── Report Builder standalone limits ────────────────────
  report_builder_student_limit: number; // max students in report_builder_students
  report_builder_guide_limit: number; // max guides (pending + accepted)
  report_builder_active_period_limit: number; // max concurrent active periods
}

const USAGE_LIMITS: Record<PlanTier, PLGUsageLimits> = {
  free: {
    report_period_history: 1,
    observation_media_count: 5,
    curriculum_student_limit: 30,
    curriculum_instance_limit: 1,
    report_builder_student_limit: 40,
    report_builder_guide_limit: 5,
    report_builder_active_period_limit: 1,
  },
  pro: {
    report_period_history: Infinity,
    observation_media_count: Infinity,
    curriculum_student_limit: Infinity,
    curriculum_instance_limit: Infinity,
    report_builder_student_limit: Infinity,
    report_builder_guide_limit: Infinity,
    report_builder_active_period_limit: Infinity,
  },
  enterprise: {
    report_period_history: Infinity,
    observation_media_count: Infinity,
    curriculum_student_limit: Infinity,
    curriculum_instance_limit: Infinity,
    report_builder_student_limit: Infinity,
    report_builder_guide_limit: Infinity,
    report_builder_active_period_limit: Infinity,
  },
};

// ============================================================
// Public API
// ============================================================

/**
 * Check if a feature is enabled for a given plan tier.
 * Call this in Server Actions before performing gated operations.
 */
export function isFeatureEnabled(
  feature: PLGFeature,
  planTier: PlanTier,
): boolean {
  return FEATURE_MATRIX[feature][planTier] ?? false;
}

/**
 * Get the usage limits for a plan tier.
 */
export function getUsageLimits(planTier: PlanTier): PLGUsageLimits {
  return USAGE_LIMITS[planTier];
}

/**
 * Determine if a template section type requires a paid plan.
 * Used by TemplateBuilder to show upsell nudges.
 */
export function isSectionTypePaid(sectionType: string): boolean {
  const paidSections = new Set([
    "mastery_summary",
    "mastery_grid",
    "observation_highlights",
  ]);
  return paidSections.has(sectionType);
}

/**
 * Get a human-readable description of what a feature unlocks.
 * Used in UpsellNudge copy.
 */
export function getFeatureUpsellCopy(feature: PLGFeature): {
  title: string;
  description: string;
  cta: string;
} {
  const copy: Record<
    PLGFeature,
    { title: string; description: string; cta: string }
  > = {
    report_mastery_summary_section: {
      title: "Auto-populate mastery progress",
      description:
        "Connect the Curriculum & Mastery module to auto-fill this section with each student's current progress.",
      cta: "Upgrade to Pro",
    },
    report_observation_highlights: {
      title: "Pull in observation highlights",
      description:
        "Automatically include key observations from the term. No copy-paste required.",
      cta: "Upgrade to Pro",
    },
    report_attendance_merge_field: {
      title: "Auto-fill attendance data",
      description:
        "Merge attendance statistics directly from the attendance module - always accurate, never manual.",
      cta: "Upgrade to Pro",
    },
    report_mastery_merge_field: {
      title: "Auto-fill mastery data",
      description:
        "Merge mastery percentages directly from curriculum tracking.",
      cta: "Upgrade to Pro",
    },
    report_parent_portal_delivery: {
      title: "Deliver reports to parents",
      description:
        "Parents receive reports instantly in the WattleOS parent portal - no printing, no email attachments.",
      cta: "Upgrade to Pro",
    },
    report_history_unlimited: {
      title: "Unlimited report history",
      description:
        "Free plan keeps 1 term of history. Upgrade to access all past report periods.",
      cta: "Upgrade to Pro",
    },
    obs_colleague_visibility: {
      title: "See colleagues' observations",
      description:
        "Work from a shared platform. All guides' observations visible to the whole team.",
      cta: "Upgrade to Pro",
    },
    obs_parent_access: {
      title: "Share with parents",
      description:
        "Publish observations directly to the parent portal. Parents see their child's learning in real time.",
      cta: "Upgrade to Pro",
    },
    obs_auto_mastery_update: {
      title: "Auto-update mastery",
      description:
        "When you publish an observation and tag an outcome, mastery updates automatically.",
      cta: "Upgrade to Pro",
    },
    obs_media_unlimited: {
      title: "Unlimited photos & video",
      description:
        "Free plan allows 5 photos per observation. Pro unlocks unlimited photos and video.",
      cta: "Upgrade to Pro",
    },
    obs_sis_student_tagging: {
      title: "Tag from student list",
      description:
        "Select students from the SIS roster instead of typing names manually.",
      cta: "Upgrade to Pro",
    },
    obs_structured_outcomes: {
      title: "Structured curriculum outcomes",
      description:
        "Tag to AMI/EYLF outcomes from the pre-loaded curriculum tree instead of free-text.",
      cta: "Upgrade to Pro",
    },
    curriculum_class_heatmap: {
      title: "Class mastery heatmap",
      description:
        "See which outcomes no student has been presented yet. Spot curriculum gaps at a glance.",
      cta: "Upgrade to Pro",
    },
    curriculum_eylf_mapping: {
      title: "EYLF cross-mapping",
      description:
        "Every outcome maps to EYLF for compliance. Auto-generate evidence portfolios.",
      cta: "Upgrade to Pro",
    },
    curriculum_obs_link: {
      title: "Link to observations",
      description:
        "When a guide records an observation and tags an outcome, mastery updates automatically.",
      cta: "Upgrade to Pro",
    },
    curriculum_pull_to_reports: {
      title: "Pull mastery into reports",
      description:
        "Report sections auto-populate from curriculum tracking. No manual data entry.",
      cta: "Upgrade to Pro",
    },
    curriculum_unlimited_students: {
      title: "Unlimited students",
      description:
        "Free plan tracks mastery for up to 30 students. Pro removes the limit.",
      cta: "Upgrade to Pro",
    },
    curriculum_multiple_instances: {
      title: "Multiple curriculum instances",
      description:
        "Run different curriculum frameworks for different classes or age groups.",
      cta: "Upgrade to Pro",
    },
    admissions_convert_to_enrollment: {
      title: "Complete enrollment",
      description:
        "To convert an accepted offer to a full student enrollment, WattleOS needs the full platform - student record, guardian accounts, billing. Everything is pre-filled.",
      cta: "Upgrade to Full Platform",
    },
  };
  return copy[feature];
}
