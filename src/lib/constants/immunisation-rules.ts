// src/lib/constants/immunisation-rules.ts
//
// ============================================================
// WattleOS V2 - Module F: State Immunisation Rules
// ============================================================
// Declarative per-state rules for IHS validity, support
// periods, and enrollment blocking. Based on:
//   - Federal: A New Tax System (Family Assistance) Act 1999
//     (No Jab No Pay)
//   - State: Public Health Acts (No Jab No Play) -
//     VIC, NSW, QLD, WA, SA
//
// WHY declarative: Each state has slightly different rules.
// A config object is easier to audit, test, and extend than
// scattered if/else blocks.
// ============================================================

export type AustralianState =
  | "ACT"
  | "NSW"
  | "NT"
  | "QLD"
  | "SA"
  | "TAS"
  | "VIC"
  | "WA";

export interface StateImmunisationRule {
  /** Australian state/territory code */
  state: AustralianState;
  /** Max age of IHS in days before it's considered stale. null = no state-specific limit */
  ihsMaxAgeDays: number | null;
  /** Support period for catch-up schedule children (weeks) */
  supportPeriodWeeks: number;
  /** Whether missing IHS blocks enrollment completion */
  blockEnrollment: boolean;
  /** Legislation reference for display */
  legislation: string;
}

// ============================================================
// Per-State Rules
// ============================================================

export const STATE_IMMUNISATION_RULES: Record<
  AustralianState,
  StateImmunisationRule
> = {
  ACT: {
    state: "ACT",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: false,
    legislation: "Public Health Act 1997 (ACT)",
  },
  NSW: {
    state: "NSW",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: true,
    legislation: "Public Health Act 2010 (NSW) - No Jab No Play",
  },
  NT: {
    state: "NT",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: false,
    legislation: "N/A (NT - no state-specific mandate)",
  },
  QLD: {
    state: "QLD",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: true,
    legislation: "Public Health Act 2005 (QLD) - No Jab No Play",
  },
  SA: {
    state: "SA",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: true,
    legislation: "South Australian Public Health Act 2011 - No Jab No Play",
  },
  TAS: {
    state: "TAS",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: false,
    legislation: "N/A (TAS - no state-specific mandate)",
  },
  VIC: {
    state: "VIC",
    ihsMaxAgeDays: 60, // IHS must be less than 2 months old at enrollment
    supportPeriodWeeks: 16,
    blockEnrollment: true,
    legislation: "No Jab No Play - Public Health and Wellbeing Act 2008 (VIC)",
  },
  WA: {
    state: "WA",
    ihsMaxAgeDays: null,
    supportPeriodWeeks: 16,
    blockEnrollment: true,
    legislation: "Public Health Act 2016 (WA) - No Jab No Play",
  },
};

// ============================================================
// Helper Functions
// ============================================================

/** Get the immunisation rule for a given state */
export function getStateRule(state: AustralianState): StateImmunisationRule {
  return STATE_IMMUNISATION_RULES[state];
}

/**
 * Check if an IHS is expired for a given state.
 * Returns true if the IHS date is older than the state's max age.
 * Returns false if the state has no max age limit.
 */
export function isIhsExpired(
  ihsDateStr: string,
  state: AustralianState,
): boolean {
  const rule = STATE_IMMUNISATION_RULES[state];
  if (rule.ihsMaxAgeDays === null) return false;

  const ihsDate = new Date(ihsDateStr);
  const now = new Date();
  const ageDays = Math.floor(
    (now.getTime() - ihsDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return ageDays > rule.ihsMaxAgeDays;
}

/**
 * Compute the support period end date (start + 16 weeks by default).
 * Returns an ISO date string (YYYY-MM-DD).
 */
export function computeSupportPeriodEnd(
  startDateStr: string,
  state: AustralianState = "NSW",
): string {
  const rule = STATE_IMMUNISATION_RULES[state];
  const start = new Date(startDateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + rule.supportPeriodWeeks * 7);
  return end.toISOString().split("T")[0];
}

/**
 * Compute the next AIR check due date.
 * For catch-up schedule children, the next check is due at the
 * end of their support period.
 */
export function computeNextAirCheckDue(supportPeriodEndStr: string): string {
  return supportPeriodEndStr;
}

/**
 * Calculate days since a given date string.
 * Returns 0 if the date is today or in the future.
 */
export function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, diff);
}
