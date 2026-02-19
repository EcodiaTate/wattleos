// src/lib/actions/parent/index.ts
//
// ============================================================
// WattleOS V2 — Parent Portal: Barrel Export
// ============================================================

// Children & identity
export {
  getMyChildren,
  getChildOverview,
  getMyGuardianRecords,
  isGuardianOf,
  isParentUser,
} from './children';
export type { ParentChild, ChildOverview } from './children';

// Portfolio (observations + mastery)
export {
  getChildObservations,
  getChildMastery,
  getChildMasteryDetails,
} from './portfolio';
export type {
  ChildObservation,
  ChildMasteryRecord,
  ChildMasterySummary,
} from './portfolio';

// Attendance
export {
  getChildAttendance,
  getChildAttendanceWeek,
} from './attendance';
export type {
  ChildAttendanceRecord,
  ChildAttendanceSummary,
  ChildAttendanceResponse,
} from './attendance';

// Reports
export {
  getChildReports,
  getChildReport,
} from './reports';
export type {
  ParentReportSummary,
  ParentReportDetail,
} from './reports';

// Settings (consent + contact)
export {
  getMySettings,
  updateConsent,
  updateContactInfo,
} from './settings';
export type {
  ParentGuardianSettings,
  UpdateConsentInput,
  UpdateContactInfoInput,
} from './settings';