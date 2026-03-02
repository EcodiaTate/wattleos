// src/lib/constants/naplan.ts
//
// Configuration constants for the NAPLAN Coordination module.
// NAPLAN 2023+ uses proficiency standards (not bands).
// Domains: Reading, Writing, Spelling, Language Conventions, Numeracy.
// Year levels assessed: 3, 5, 7, 9.

import type {
  NaplanDomain,
  NaplanProficiencyLevel,
  NaplanWindowStatus,
  NaplanYearLevel,
} from "@/types/domain";

// ============================================================
// Window status
// ============================================================

export interface NaplanWindowStatusConfig {
  label: string;
  description: string;
  cssVar: string;
  sortOrder: number;
  canEdit: boolean;
  canEnterResults: boolean;
}

export const NAPLAN_WINDOW_STATUS_CONFIG: Record<
  NaplanWindowStatus,
  NaplanWindowStatusConfig
> = {
  draft: {
    label: "Draft",
    description: "Setting up - cohort not yet generated",
    cssVar: "naplan-window-draft",
    sortOrder: 0,
    canEdit: true,
    canEnterResults: false,
  },
  active: {
    label: "Active",
    description: "Test window open - results can be entered",
    cssVar: "naplan-window-active",
    sortOrder: 1,
    canEdit: true,
    canEnterResults: true,
  },
  closed: {
    label: "Closed",
    description: "All results finalised",
    cssVar: "naplan-window-closed",
    sortOrder: 2,
    canEdit: false,
    canEnterResults: false,
  },
};

// ============================================================
// NAPLAN domains
// ============================================================

export interface NaplanDomainConfig {
  label: string;
  shortLabel: string;
  sortOrder: number;
}

export const NAPLAN_DOMAIN_CONFIG: Record<NaplanDomain, NaplanDomainConfig> = {
  reading: {
    label: "Reading",
    shortLabel: "Read",
    sortOrder: 0,
  },
  writing: {
    label: "Writing",
    shortLabel: "Write",
    sortOrder: 1,
  },
  spelling: {
    label: "Spelling",
    shortLabel: "Spell",
    sortOrder: 2,
  },
  language_conventions: {
    label: "Grammar & Punctuation",
    shortLabel: "Lang",
    sortOrder: 3,
  },
  numeracy: {
    label: "Numeracy",
    shortLabel: "Num",
    sortOrder: 4,
  },
};

export const NAPLAN_DOMAINS: NaplanDomain[] = [
  "reading",
  "writing",
  "spelling",
  "language_conventions",
  "numeracy",
];

// ============================================================
// Proficiency levels (ACARA 2023+)
// ============================================================

export interface NaplanProficiencyConfig {
  label: string;
  shortLabel: string;
  description: string;
  cssVar: string;
  sortOrder: number;
  meetsNms: boolean;
}

export const NAPLAN_PROFICIENCY_CONFIG: Record<
  NaplanProficiencyLevel,
  NaplanProficiencyConfig
> = {
  needs_additional_support: {
    label: "Needs Additional Support",
    shortLabel: "NAS",
    description: "Below the National Minimum Standard",
    cssVar: "naplan-needs-additional-support",
    sortOrder: 0,
    meetsNms: false,
  },
  developing: {
    label: "Developing",
    shortLabel: "Dev",
    description: "At or approaching the National Minimum Standard",
    cssVar: "naplan-developing",
    sortOrder: 1,
    meetsNms: true,
  },
  strong: {
    label: "Strong",
    shortLabel: "Str",
    description: "Solidly above the National Minimum Standard",
    cssVar: "naplan-strong",
    sortOrder: 2,
    meetsNms: true,
  },
  exceeding: {
    label: "Exceeding",
    shortLabel: "Exc",
    description: "Demonstrating high-level skills and knowledge",
    cssVar: "naplan-exceeding",
    sortOrder: 3,
    meetsNms: true,
  },
};

export const NAPLAN_PROFICIENCY_LEVELS: NaplanProficiencyLevel[] = [
  "needs_additional_support",
  "developing",
  "strong",
  "exceeding",
];

// ============================================================
// Year levels
// ============================================================

export const NAPLAN_YEAR_LEVELS: NaplanYearLevel[] = [3, 5, 7, 9];

export const NAPLAN_YEAR_LEVEL_LABELS: Record<NaplanYearLevel, string> = {
  3: "Year 3",
  5: "Year 5",
  7: "Year 7",
  9: "Year 9",
};

// ============================================================
// Helpers
// ============================================================

export function currentNaplanYear(): number {
  // NAPLAN is conducted in March each year.
  // Return the current calendar year as the collection year.
  return new Date().getFullYear();
}

export function naplanYearLabel(year: number): string {
  return `NAPLAN ${year}`;
}

export function naplanCompletionRate(
  enteredDomains: number,
  totalDomains: number,
): number {
  if (totalDomains === 0) return 0;
  return Math.round((enteredDomains / totalDomains) * 100);
}

// Number of domains a student should have results for (all 5 if not opted out)
export const NAPLAN_TOTAL_DOMAINS = 5;
