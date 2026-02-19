// src/lib/actions/parent/index.ts
//
// ============================================================
// WattleOS V2 - Parent Portal: Barrel Export
// ============================================================

// Children & identity
export {
  getChildOverview,
  getMyChildren,
  getMyGuardianRecords,
  isGuardianOf,
  isParentUser,
} from "./children";
export type { ChildOverview, ParentChild } from "./children";

// Portfolio (observations + mastery)
export {
  getChildMastery,
  getChildMasteryDetails,
  getChildObservations,
} from "./portfolio";
export type {
  ChildMasteryRecord,
  ChildMasterySummary,
  ChildObservation,
} from "./portfolio";

// Attendance
export { getChildAttendance, getChildAttendanceWeek } from "./attendance";
export type {
  ChildAttendanceRecord,
  ChildAttendanceResponse,
  ChildAttendanceSummary,
} from "./attendance";

// Reports
export { getChildReport, getChildReports } from "./reports";
export type { ParentReportDetail, ParentReportSummary } from "./reports";

// Settings (consent + contact)
export { getMySettings, updateConsent, updateContactInfo } from "./settings";
export type {
  ParentGuardianSettings,
  UpdateConsentInput,
  UpdateContactInfoInput,
} from "./settings";
