// src/lib/actions/reports/index.ts
//
// ============================================================
// WattleOS V2 — Reports Actions Barrel Export
// ============================================================
// Re-exports all Reporting actions for convenient importing.
// Usage:
//   import { listReportTemplates, generateStudentReport } from '@/lib/actions/reports';
// ============================================================

// ── Template CRUD ───────────────────────────────────────────
export {
  listReportTemplates,
  getReportTemplate,
  createReportTemplate,
  updateReportTemplate,
  duplicateReportTemplate,
  deleteReportTemplate,
} from './templates';

export type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateWithStats,
} from './templates';

// ── Student Report CRUD + Generation ────────────────────────
export {
  listStudentReports,
  getStudentReport,
  generateStudentReport,
  bulkGenerateReports,
  updateReportContent,
  updateReportStatus,
  deleteStudentReport,
  getReportCompletionStats,
  getReportTerms,
} from './student-reports';

export type {
  GenerateReportInput,
  BulkGenerateReportsInput,
  UpdateReportContentInput,
  ListReportsParams,
  ReportWithDetails,
  ReportCompletionStats,
} from './student-reports';