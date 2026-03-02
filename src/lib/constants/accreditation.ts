// src/lib/constants/accreditation.ts
//
// ============================================================
// WattleOS - Montessori Accreditation Checklist
// ============================================================
// Display configs for accreditation bodies, ratings, and
// cycle statuses. The canonical criteria list lives in the
// database (global seed rows with tenant_id NULL).
// ============================================================

import type {
  AccreditationBodyCode,
  AccreditationRating,
  AccreditationCycleStatus,
  AccreditationEvidenceType,
} from "@/types/domain";

// ============================================================
// Accreditation Bodies
// ============================================================

export interface AccreditationBodyConfig {
  code: AccreditationBodyCode;
  label: string;
  fullName: string;
  country: string;
  website: string;
  description: string;
  cssVar: string;
}

export const ACCREDITATION_BODIES: Record<
  AccreditationBodyCode,
  AccreditationBodyConfig
> = {
  ami: {
    code: "ami",
    label: "AMI",
    fullName: "Association Montessori Internationale",
    country: "International",
    website: "https://ami.education",
    description:
      "Founded by Maria Montessori in 1929. The original international Montessori accreditation body.",
    cssVar: "var(--accreditation-ami)",
  },
  ams: {
    code: "ams",
    label: "AMS",
    fullName: "American Montessori Society",
    country: "USA / International",
    website: "https://amshq.org",
    description:
      "US-founded body with an international accreditation programme for Montessori schools.",
    cssVar: "var(--accreditation-ams)",
  },
  msaa: {
    code: "msaa",
    label: "MSAA",
    fullName: "Montessori Schools Association of Australia",
    country: "Australia",
    website: "https://montessori.org.au",
    description:
      "The peak Australian Montessori body offering membership and quality accreditation.",
    cssVar: "var(--accreditation-msaa)",
  },
};

// ============================================================
// Ratings
// ============================================================

export interface AccreditationRatingConfig {
  label: string;
  description: string;
  cssVar: string;
  fgVar: string;
  bgVar: string;
  order: number;
}

export const ACCREDITATION_RATING_CONFIG: Record<
  AccreditationRating,
  AccreditationRatingConfig
> = {
  not_started: {
    label: "Not Started",
    description: "This criterion has not yet been assessed.",
    cssVar: "var(--accreditation-not-started)",
    fgVar: "var(--accreditation-not-started-fg)",
    bgVar: "var(--accreditation-not-started-bg)",
    order: 0,
  },
  not_met: {
    label: "Not Met",
    description: "The school does not yet meet this criterion.",
    cssVar: "var(--accreditation-not-met)",
    fgVar: "var(--accreditation-not-met-fg)",
    bgVar: "var(--accreditation-not-met-bg)",
    order: 1,
  },
  partially_met: {
    label: "Partially Met",
    description: "Some aspects of this criterion are in place.",
    cssVar: "var(--accreditation-partially-met)",
    fgVar: "var(--accreditation-partially-met-fg)",
    bgVar: "var(--accreditation-partially-met-bg)",
    order: 2,
  },
  met: {
    label: "Met",
    description: "The school consistently meets this criterion.",
    cssVar: "var(--accreditation-met)",
    fgVar: "var(--accreditation-met-fg)",
    bgVar: "var(--accreditation-met-bg)",
    order: 3,
  },
  exceeds: {
    label: "Exceeds",
    description:
      "The school demonstrates exemplary practice beyond the standard.",
    cssVar: "var(--accreditation-exceeds)",
    fgVar: "var(--accreditation-exceeds-fg)",
    bgVar: "var(--accreditation-exceeds-bg)",
    order: 4,
  },
};

export const ACCREDITATION_RATINGS_ORDERED: AccreditationRating[] = [
  "not_started",
  "not_met",
  "partially_met",
  "met",
  "exceeds",
];

// ============================================================
// Cycle Statuses
// ============================================================

export interface AccreditationCycleStatusConfig {
  label: string;
  description: string;
  cssVar: string;
  fgVar: string;
  bgVar: string;
  isTerminal: boolean;
}

export const ACCREDITATION_CYCLE_STATUS_CONFIG: Record<
  AccreditationCycleStatus,
  AccreditationCycleStatusConfig
> = {
  draft: {
    label: "Draft",
    description: "Planning the accreditation cycle, not yet in self-study.",
    cssVar: "var(--accreditation-cycle-draft)",
    fgVar: "var(--accreditation-cycle-draft-fg)",
    bgVar: "var(--accreditation-cycle-draft-bg)",
    isTerminal: false,
  },
  self_study: {
    label: "Self Study",
    description: "Active self-assessment phase.",
    cssVar: "var(--accreditation-cycle-self-study)",
    fgVar: "var(--accreditation-cycle-self-study-fg)",
    bgVar: "var(--accreditation-cycle-self-study-bg)",
    isTerminal: false,
  },
  submitted: {
    label: "Submitted",
    description:
      "Application and portfolio submitted to the accreditation body.",
    cssVar: "var(--accreditation-cycle-submitted)",
    fgVar: "var(--accreditation-cycle-submitted-fg)",
    bgVar: "var(--accreditation-cycle-submitted-bg)",
    isTerminal: false,
  },
  under_review: {
    label: "Under Review",
    description: "Assessor visit scheduled or underway.",
    cssVar: "var(--accreditation-cycle-under-review)",
    fgVar: "var(--accreditation-cycle-under-review-fg)",
    bgVar: "var(--accreditation-cycle-under-review-bg)",
    isTerminal: false,
  },
  accredited: {
    label: "Accredited",
    description: "Accreditation granted.",
    cssVar: "var(--accreditation-cycle-accredited)",
    fgVar: "var(--accreditation-cycle-accredited-fg)",
    bgVar: "var(--accreditation-cycle-accredited-bg)",
    isTerminal: true,
  },
  conditional: {
    label: "Conditional",
    description: "Accreditation granted with conditions to be addressed.",
    cssVar: "var(--accreditation-cycle-conditional)",
    fgVar: "var(--accreditation-cycle-conditional-fg)",
    bgVar: "var(--accreditation-cycle-conditional-bg)",
    isTerminal: false,
  },
  lapsed: {
    label: "Lapsed",
    description: "Accreditation has expired or was not renewed.",
    cssVar: "var(--accreditation-cycle-lapsed)",
    fgVar: "var(--accreditation-cycle-lapsed-fg)",
    bgVar: "var(--accreditation-cycle-lapsed-bg)",
    isTerminal: true,
  },
};

// ============================================================
// Evidence Types
// ============================================================

export const EVIDENCE_TYPE_CONFIG: Record<
  AccreditationEvidenceType,
  { label: string; icon: string }
> = {
  document: { label: "Document", icon: "📄" },
  link: { label: "Link", icon: "🔗" },
  observation: { label: "Observation", icon: "👁️" },
  photo: { label: "Photo", icon: "📷" },
  note: { label: "Note", icon: "📝" },
};

// ============================================================
// Helpers
// ============================================================

/** Returns true if a rating counts as "meeting" the criterion. */
export function isMetOrExceeds(rating: AccreditationRating): boolean {
  return rating === "met" || rating === "exceeds";
}

/** Progress percentage from met/exceeds count over total. */
export function calcProgressPct(metCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((metCount / totalCount) * 100);
}
