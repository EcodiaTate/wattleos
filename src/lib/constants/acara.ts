// src/lib/constants/acara.ts
//
// ACARA Annual School Collection (ASC) - Reference values
// for student demographic profile export.
//
// Code mappings align with the ACARA data specification:
//   https://acara.edu.au/reporting/national-data-collection

import type {
  IndigenousStatus,
  LanguageBackground,
  ParentEducationLevel,
  ParentOccupationGroup,
} from "@/types/domain";

// ── Parent Education Level ────────────────────────────────────
// Highest education level of either parent/guardian.

export const PARENT_EDUCATION_CONFIG: Record<
  ParentEducationLevel,
  { label: string; acaraCode: string }
> = {
  year_9_or_below: { label: "Year 9 or equivalent or below", acaraCode: "1" },
  year_10: { label: "Year 10 or equivalent", acaraCode: "2" },
  year_11: { label: "Year 11 or equivalent", acaraCode: "3" },
  year_12: { label: "Year 12 or equivalent", acaraCode: "4" },
  certificate_i_iv: {
    label: "Certificate I to IV (incl. trade)",
    acaraCode: "5",
  },
  diploma: { label: "Advanced Diploma / Diploma", acaraCode: "6" },
  bachelor: { label: "Bachelor degree or above", acaraCode: "7" },
  postgraduate: { label: "Postgraduate degree", acaraCode: "8" },
  not_stated: { label: "Not stated / unknown", acaraCode: "9" },
};

// ── Parent Occupation Group ───────────────────────────────────
// Occupation group of either parent/guardian (highest).

export const PARENT_OCCUPATION_CONFIG: Record<
  ParentOccupationGroup,
  { label: string; description: string; acaraCode: string }
> = {
  group_1: {
    label: "Group 1",
    description:
      "Senior management in large business, government admin, qualified professionals",
    acaraCode: "1",
  },
  group_2: {
    label: "Group 2",
    description:
      "Other business managers, arts/media/sports, associate professionals",
    acaraCode: "2",
  },
  group_3: {
    label: "Group 3",
    description: "Tradespeople, clerks, skilled office/sales/service staff",
    acaraCode: "3",
  },
  group_4: {
    label: "Group 4",
    description: "Machine operators, hospitality staff, assistants, labourers",
    acaraCode: "4",
  },
  not_in_paid_work: {
    label: "Not in paid work",
    description: "Not in paid work in the last 12 months",
    acaraCode: "8",
  },
  not_stated: {
    label: "Not stated",
    description: "Not stated / unknown",
    acaraCode: "9",
  },
};

// ── Indigenous Status ACARA Codes ─────────────────────────────

export const INDIGENOUS_STATUS_ACARA_CODE: Record<IndigenousStatus, string> = {
  aboriginal: "1",
  torres_strait_islander: "2",
  both: "3",
  neither: "4",
  not_stated: "9",
};

// ── Language Background ACARA Codes ───────────────────────────

export const LANGUAGE_BACKGROUND_ACARA_CODE: Record<
  LanguageBackground,
  string
> = {
  english_only: "1",
  lbote: "2",
  not_stated: "9",
};
