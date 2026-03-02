
// src/lib/actions/reports/index.ts
//
// ============================================================
// WattleOS V2 - Reports Actions Barrel Export
// ============================================================
// Re-exports all Reporting actions for convenient importing.
// Usage:
//   import { listReportTemplates, generateStudentReport } from '@/lib/actions/reports';
// ============================================================

// ── Template CRUD ───────────────────────────────────────────
export {
  createReportTemplate,
  deleteReportTemplate,
  duplicateReportTemplate,
  getReportTemplate,
  listReportTemplates,
  updateReportTemplate,
} from "./templates";

export type {
  CreateTemplateInput,
  TemplateWithStats,
  UpdateTemplateInput,
} from "./templates";

// ── Student Report CRUD + Generation ────────────────────────
export {
  bulkGenerateReports,
  deleteStudentReport,
  generateStudentReport,
  getReportCompletionStats,
  getReportTerms,
  getStudentReport,
  listStudentReports,
  updateReportContent,
  updateReportStatus,
} from "./student-reports";

export type {
  BulkGenerateReportsInput,
  GenerateReportInput,
  ListReportsParams,
  ReportCompletionStats,
  ReportWithDetails,
  UpdateReportContentInput,
} from "./student-reports";

// ── PLG: Report Periods ──────────────────────────────────────
export {
  activateReportPeriod,
  closeReportPeriod,
  createReportPeriod,
  generateReportInstances,
  getActivePeriod,
  getReportPeriod,
  getReportPeriodDashboard,
  listReportPeriods,
  updateReportPeriod,
} from "./periods";

export type {
  CreateReportPeriodInput,
  GenerateInstancesInput,
  UpdateReportPeriodInput,
} from "./periods";

// ── PLG: Report Instances ────────────────────────────────────
export {
  approveInstance,
  assignInstanceGuide,
  bulkApproveInstances,
  countMySubmissions,
  getReportInstance,
  listMyInstances,
  listPeriodInstances,
  requestInstanceChanges,
  saveInstanceDraft,
  submitInstance,
} from "./instances";

export type {
  RequestChangesInput,
  SaveInstanceDraftInput,
} from "./instances";

// ── Report Builder Standalone ────────────────────────────────
export {
  listReportBuilderStudents,
  getStudentCount,
  listClassLabels,
  addReportBuilderStudent,
  updateReportBuilderStudent,
  deleteReportBuilderStudent,
  importStudentsFromCsv,
} from "./report-builder-students";

export type {
  ReportBuilderStudent,
  CsvStudentRow,
  AddStudentInput,
  UpdateStudentInput,
} from "./report-builder-students";

export {
  listGuideInvitations,
  listActiveGuides,
  getGuideCount,
  inviteGuide,
  resendGuideInvite,
  revokeGuideInvite,
} from "./guide-invitations";

export type {
  GuideInvitation,
  ActiveGuide,
  InviteGuideInput,
} from "./guide-invitations";

export {
  getReportSettings,
  updateReportSettings,
} from "./report-settings";

export type {
  ReportSettings,
  UpdateReportSettingsInput,
} from "./report-settings";
