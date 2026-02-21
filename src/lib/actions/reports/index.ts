
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
