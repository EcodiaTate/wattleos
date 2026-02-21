
// ============================================================
// WattleOS V2 - Module 10: Enrollment
// ============================================================
// Barrel export for all enrollment server actions.
// Split into three files by domain responsibility:
//   - enrollment-periods: Window configuration (when enrollment is open)
//   - enrollment-applications: Full application lifecycle + approval cascade
//   - enrollment-documents: Document upload metadata & verification
// ============================================================

export {
  approveApplication,
  getApplicationDetails,
  getApplicationStatusByEmail,
  // Actions
  listEnrollmentApplications,
  markUnderReview,
  rejectApplication,
  requestApplicationChanges,
  submitEnrollmentApplication,
  withdrawApplication,
  type ApprovalResult,
  type ApproveApplicationInput,
  type ListApplicationsParams,
  type ReviewApplicationInput,
  // Types
  type SubmitApplicationInput,
} from "./enrollment-applications";

export {
  createEnrollmentDocument,
  deleteEnrollmentDocument,
  // Actions
  listApplicationDocuments,
  unverifyDocument,
  updateDocumentNotes,
  verifyDocument,
  // Types
  type CreateDocumentInput,
} from "./enrollment-documents";

export {
  archiveEnrollmentPeriod,
  closeEnrollmentPeriod,
  createEnrollmentPeriod,
  deleteEnrollmentPeriod,
  getEnrollmentPeriod,
  getOpenEnrollmentPeriods,
  // Actions
  listEnrollmentPeriods,
  openEnrollmentPeriod,
  updateEnrollmentPeriod,
  // Types
  type CreateEnrollmentPeriodInput,
  type EnrollmentPeriodWithStats,
  type UpdateEnrollmentPeriodInput,
} from "./enrollment-periods";
