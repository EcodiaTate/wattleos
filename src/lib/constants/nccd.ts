// src/lib/constants/nccd.ts
//
// ============================================================
// WattleOS - NCCD Disability Register Constants
// ============================================================
// Configuration maps for all NCCD enum types.
// Aligned to the DSS 2024 NCCD guidelines and data portal.
//
// NCCD = Nationally Consistent Collection of Data on
// School Students with Disability (federal obligation).
// ============================================================

import type {
  NccdAdjustmentLevel,
  NccdAdjustmentType,
  NccdDisabilityCategory,
  NccdEvidenceType,
  NccdFundingSource,
  NccdStatus,
} from "@/types/domain";

// ── Disability Categories ─────────────────────────────────────

export const NCCD_CATEGORY_CONFIG: Record<
  NccdDisabilityCategory,
  { label: string; description: string; emoji: string; cssVar: string }
> = {
  physical: {
    label: "Physical",
    description:
      "Students with permanent or temporary physical disability affecting mobility, self-care, or participation",
    emoji: "♿",
    cssVar: "var(--nccd-physical)",
  },
  cognitive: {
    label: "Cognitive/Neurological",
    description:
      "Students with cognitive, intellectual, or neurological disability affecting learning and participation",
    emoji: "🧠",
    cssVar: "var(--nccd-cognitive)",
  },
  sensory_hearing: {
    label: "Sensory - Hearing",
    description:
      "Students who are Deaf, hard of hearing, or have an auditory processing disability",
    emoji: "👂",
    cssVar: "var(--nccd-sensory-hearing)",
  },
  sensory_vision: {
    label: "Sensory - Vision",
    description:
      "Students who are blind, have low vision, or have a visual processing disability",
    emoji: "👁️",
    cssVar: "var(--nccd-sensory-vision)",
  },
  social_emotional: {
    label: "Social/Emotional",
    description:
      "Students with social/emotional or mental health disability that affects learning and participation",
    emoji: "💛",
    cssVar: "var(--nccd-social-emotional)",
  },
};

// ── Adjustment Levels ─────────────────────────────────────────
// Listed in ascending order of intensity (NCCD official order).

export const NCCD_LEVEL_CONFIG: Record<
  NccdAdjustmentLevel,
  {
    label: string;
    shortLabel: string;
    description: string;
    cssVar: string;
    fgVar: string;
    bgVar: string;
    order: number;
  }
> = {
  qdtp: {
    label: "Quality Differentiated Teaching Practice",
    shortLabel: "QDTP",
    description:
      "Evidence-based, inclusive teaching practices embedded in everyday instruction - no additional resources required",
    cssVar: "var(--nccd-qdtp)",
    fgVar: "var(--nccd-qdtp-fg)",
    bgVar: "var(--nccd-qdtp-bg)",
    order: 1,
  },
  supplementary: {
    label: "Supplementary Adjustments",
    shortLabel: "Supplementary",
    description:
      "Periodic support from specialist staff or additional resources beyond the classroom teacher",
    cssVar: "var(--nccd-supplementary)",
    fgVar: "var(--nccd-supplementary-fg)",
    bgVar: "var(--nccd-supplementary-bg)",
    order: 2,
  },
  substantial: {
    label: "Substantial Adjustments",
    shortLabel: "Substantial",
    description:
      "Frequent and ongoing support from specialist staff or significant modification to curriculum and environment",
    cssVar: "var(--nccd-substantial)",
    fgVar: "var(--nccd-substantial-fg)",
    bgVar: "var(--nccd-substantial-bg)",
    order: 3,
  },
  extensive: {
    label: "Extensive Adjustments",
    shortLabel: "Extensive",
    description:
      "Highly individualised adjustments across all or most areas of schooling; typically includes 1:1 support",
    cssVar: "var(--nccd-extensive)",
    fgVar: "var(--nccd-extensive-fg)",
    bgVar: "var(--nccd-extensive-bg)",
    order: 4,
  },
};

// ── Adjustment Types (CEIA) ───────────────────────────────────

export const NCCD_ADJUSTMENT_TYPE_CONFIG: Record<
  NccdAdjustmentType,
  { label: string; description: string; emoji: string }
> = {
  curriculum: {
    label: "Curriculum",
    description:
      "Adjustments to learning outcomes, content, or complexity; alternative or modified curriculum",
    emoji: "📚",
  },
  environment: {
    label: "Environmental",
    description:
      "Physical or social environment modifications - seating, lighting, sensory supports, assistive technology",
    emoji: "🏫",
  },
  instruction: {
    label: "Instructional",
    description:
      "Changes to teaching methods, delivery mode, additional time, or differentiated instruction strategies",
    emoji: "📝",
  },
  assessment: {
    label: "Assessment",
    description:
      "Modified assessment tasks, alternative formats, additional time, or scribe/reader support",
    emoji: "📋",
  },
};

// ── Funding Sources ───────────────────────────────────────────

export const NCCD_FUNDING_CONFIG: Record<
  NccdFundingSource,
  { label: string; description: string }
> = {
  inclusion_support_programme: {
    label: "Inclusion Support Programme",
    description: "Commonwealth ISP funding for early childhood services",
  },
  ndis: {
    label: "NDIS",
    description: "National Disability Insurance Scheme participant funding",
  },
  state_disability: {
    label: "State/Territory Disability Funding",
    description:
      "State or territory education department disability funding (e.g. Program for Students with Disabilities)",
  },
  school_funded: {
    label: "School-Funded",
    description: "Adjustments funded entirely from the school's own resources",
  },
  none: {
    label: "No External Funding",
    description: "No external disability-specific funding received",
  },
  other: {
    label: "Other",
    description: "Other funding arrangement - specify in notes",
  },
};

// ── Status ────────────────────────────────────────────────────

export const NCCD_STATUS_CONFIG: Record<
  NccdStatus,
  { label: string; cssVar: string; fgVar: string; bgVar: string }
> = {
  active: {
    label: "Active",
    cssVar: "var(--nccd-status-active)",
    fgVar: "var(--nccd-status-active-fg)",
    bgVar: "var(--nccd-status-active-bg)",
  },
  under_review: {
    label: "Under Review",
    cssVar: "var(--nccd-status-under-review)",
    fgVar: "var(--nccd-status-under-review-fg)",
    bgVar: "var(--nccd-status-under-review-bg)",
  },
  exited: {
    label: "Exited",
    cssVar: "var(--nccd-status-exited)",
    fgVar: "var(--nccd-status-exited-fg)",
    bgVar: "var(--nccd-status-exited-bg)",
  },
  archived: {
    label: "Archived",
    cssVar: "var(--nccd-status-archived)",
    fgVar: "var(--nccd-status-archived-fg)",
    bgVar: "var(--nccd-status-archived-bg)",
  },
};

// ── Evidence Types ────────────────────────────────────────────

export const NCCD_EVIDENCE_CONFIG: Record<
  NccdEvidenceType,
  { label: string; emoji: string }
> = {
  professional_report: { label: "Professional Assessment Report", emoji: "🩺" },
  school_assessment: { label: "School-Based Assessment", emoji: "📊" },
  classroom_observation: {
    label: "Classroom Observation Record",
    emoji: "👁️",
  },
  parent_report: { label: "Parent/Family Information", emoji: "👨‍👩‍👧" },
  medical_certificate: { label: "Medical Certificate/Diagnosis", emoji: "🏥" },
  ndis_plan: { label: "NDIS Plan", emoji: "📄" },
  naplan_results: { label: "NAPLAN Results", emoji: "📈" },
  work_sample: { label: "Work Sample / Portfolio", emoji: "🗂️" },
  other: { label: "Other Evidence", emoji: "📎" },
};

// ── Derived Helpers ───────────────────────────────────────────

/** Returns the collection year to pre-fill in new entries.
 *  NCCD collection uses the current calendar year. */
export function currentNccdYear(): number {
  return new Date().getFullYear();
}

/** All adjustment levels sorted by intensity order. */
export const NCCD_LEVELS_ORDERED: NccdAdjustmentLevel[] = [
  "qdtp",
  "supplementary",
  "substantial",
  "extensive",
];

/** All disability categories. */
export const NCCD_CATEGORIES: NccdDisabilityCategory[] = [
  "physical",
  "cognitive",
  "sensory_hearing",
  "sensory_vision",
  "social_emotional",
];
