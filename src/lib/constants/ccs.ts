// src/lib/constants/ccs.ts
//
// ============================================================
// CCS Session Reporting - Constants & Helpers
// ============================================================
// Australian CCS (Child Care Subsidy) reference values.
// Financial year is Jul–Jun (e.g., "2025-26" = 1 Jul 2025 to 30 Jun 2026).
// ============================================================

import type { ProgramType, CcsSessionType } from "@/types/domain";

/** Maximum capped absence days per child per financial year */
export const CCS_ANNUAL_ABSENCE_CAP = 42;

/** Threshold at which we show a warning (35 of 42 used) */
export const CCS_WARNING_THRESHOLD = 35;

/** CCS reports must be submitted within 14 days of the week ending */
export const CCS_SUBMISSION_DEADLINE_DAYS = 14;

/**
 * Returns the Australian financial year string for a given date.
 * FY runs 1 Jul – 30 Jun. E.g., 15 Feb 2026 → "2025-26".
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed (0=Jan, 6=Jul)
  const year = date.getFullYear();

  // Jul (6) onwards = start of new FY
  if (month >= 6) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}

/**
 * Returns the start and end ISO dates for a financial year string.
 * E.g., "2025-26" → { start: "2025-07-01", end: "2026-06-30" }
 */
export function getFinancialYearDates(fy: string): {
  start: string;
  end: string;
} {
  const startYear = parseInt(fy.split("-")[0], 10);
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
  };
}

/**
 * Maps a WattleOS program type to its CCS session type.
 * Only CCS-eligible program types have meaningful mappings.
 */
export function mapProgramTypeToCcsSessionType(
  programType: ProgramType,
): CcsSessionType {
  switch (programType) {
    case "before_school_care":
    case "after_school_care":
      return "oshc";
    case "vacation_care":
      return "vacation_care";
    case "extended_day":
    case "adolescent_program":
      return "long_day_care";
    default:
      return "occasional";
  }
}

/**
 * Returns the Monday of the week containing the given date.
 * Used to determine CCS week boundaries (Mon–Sun).
 */
export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the Sunday of the week containing the given date.
 */
export function getWeekEndDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}
