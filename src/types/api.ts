// ============================================================
// WattleOS V2 - API Response Types
// ============================================================
// Every Server Action returns one of these shapes.
// No Action throws. No error fails silently.
// The calling component always checks both fields.
// ============================================================

// ============================================================
// Error Codes
// ============================================================
// Standardized error codes used across all Server Actions.
// Actions use these as the `code` field in error responses.
// UI can match on these to show contextual error messages.
// ============================================================

export const ErrorCodes = {
  // Auth & Access
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  CHANNEL_INACTIVE: 'CHANNEL_INACTIVE',
  POSTING_RESTRICTED: 'POSTING_RESTRICTED',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  RSVP_DISABLED: 'RSVP_DISABLED',
  EVENT_AT_CAPACITY: 'EVENT_AT_CAPACITY',
  ANNOUNCEMENT_ALREADY_PUBLISHED: 'ANNOUNCEMENT_ALREADY_PUBLISHED',
  DIRECTORY_ENTRY_NOT_FOUND: 'DIRECTORY_ENTRY_NOT_FOUND',

  // CRUD
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED:'RATE_LIMITED',

  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CREATE_FAILED: 'CREATE_FAILED',
  // ── Module 10: Enrollment ──────────────────────────────────
  ENROLLMENT_PERIOD_NOT_FOUND: 'ENROLLMENT_PERIOD_NOT_FOUND',
  APPLICATION_NOT_FOUND: 'APPLICATION_NOT_FOUND',
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
  EMAIL_MISMATCH: 'EMAIL_MISMATCH',

  // ── Module 11: Programs / OSHC ────────────────────────────
  PROGRAM_NOT_FOUND: 'PROGRAM_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  SESSION_FULL: 'SESSION_FULL',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  LATE_CANCELLATION: 'LATE_CANCELLATION',
  INELIGIBLE_STUDENT: 'INELIGIBLE_STUDENT',

  // ── Module 12: Communications ──────────────────────────────
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
  NOT_CHANNEL_MEMBER: 'NOT_CHANNEL_MEMBER',
  MESSAGE_HIDDEN: 'MESSAGE_HIDDEN',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  RSVP_DEADLINE_PASSED: 'RSVP_DEADLINE_PASSED',

  // ── Module 13: Admissions ──────────────────────────────────
  WAITLIST_ENTRY_NOT_FOUND: 'WAITLIST_ENTRY_NOT_FOUND',
  INVALID_STAGE_TRANSITION: 'INVALID_STAGE_TRANSITION',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  TOUR_SLOT_FULL: 'TOUR_SLOT_FULL',

  // ── Module 14: Curriculum Content ──────────────────────────
  CROSS_MAPPING_NOT_FOUND: 'CROSS_MAPPING_NOT_FOUND',
  DUPLICATE_MAPPING: 'DUPLICATE_MAPPING',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',

  // Curriculum
  FORK_FAILED: 'FORK_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  INSTANCE_NOT_FOUND: 'INSTANCE_NOT_FOUND',
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
  REORDER_FAILED: 'REORDER_FAILED',

  // Observations
  OBSERVATION_NOT_FOUND: 'OBSERVATION_NOT_FOUND',
  PUBLISH_FAILED: 'PUBLISH_FAILED',
  ARCHIVE_FAILED: 'ARCHIVE_FAILED',
  ALREADY_PUBLISHED: 'ALREADY_PUBLISHED',
  CONSENT_WARNING: 'CONSENT_WARNING',

  // Mastery
  MASTERY_UPDATE_FAILED: 'MASTERY_UPDATE_FAILED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',

  // Students & SIS
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  ENROLLMENT_FAILED: 'ENROLLMENT_FAILED',
  GUARDIAN_NOT_FOUND: 'GUARDIAN_NOT_FOUND',

  // Attendance
  ATTENDANCE_ALREADY_RECORDED: 'ATTENDANCE_ALREADY_RECORDED',
  ATTENDANCE_UPDATE_FAILED: 'ATTENDANCE_UPDATE_FAILED',

  // Reporting
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  TEMPLATE_RENDER_FAILED: 'TEMPLATE_RENDER_FAILED',

  // Integrations
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  SYNC_FAILED: 'SYNC_FAILED',

  // ── Module B: Medication Administration (Reg 93/94) ────────
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  AUTHORISATION_NOT_FOUND: 'AUTHORISATION_NOT_FOUND',
  AUTHORISATION_EXPIRED: 'AUTHORISATION_EXPIRED',
  AUTHORISATION_INACTIVE: 'AUTHORISATION_INACTIVE',
  ADMINISTRATION_IMMUTABLE: 'ADMINISTRATION_IMMUTABLE',
  NO_ACTIVE_AUTHORISATION: 'NO_ACTIVE_AUTHORISATION',

  // ── Module L: Emergency Drills (Reg 97) ───────────────────
  DRILL_NOT_FOUND: 'DRILL_NOT_FOUND',
  DRILL_NOT_EDITABLE: 'DRILL_NOT_EDITABLE',
  DRILL_ALREADY_COMPLETED: 'DRILL_ALREADY_COMPLETED',

  // ── Module M: Live Emergency Coordination ────────────────
  EMERGENCY_ALREADY_ACTIVE: 'EMERGENCY_ALREADY_ACTIVE',
  EMERGENCY_NOT_ACTIVE: 'EMERGENCY_NOT_ACTIVE',
  INVALID_EMERGENCY_STATUS_TRANSITION: 'INVALID_EMERGENCY_STATUS_TRANSITION',
  EMERGENCY_EVENT_NOT_FOUND: 'EMERGENCY_EVENT_NOT_FOUND',
  ZONE_NOT_FOUND: 'ZONE_NOT_FOUND',

  // ── Module Q: Individual Learning Plans ────────────────────
  ILP_PLAN_NOT_FOUND: 'ILP_PLAN_NOT_FOUND',
  ILP_GOAL_NOT_FOUND: 'ILP_GOAL_NOT_FOUND',
  ILP_STRATEGY_NOT_FOUND: 'ILP_STRATEGY_NOT_FOUND',
  ILP_NOT_EDITABLE: 'ILP_NOT_EDITABLE',
  INVALID_ILP_STATUS_TRANSITION: 'INVALID_ILP_STATUS_TRANSITION',
  TRANSITION_STATEMENT_NOT_FOUND: 'TRANSITION_STATEMENT_NOT_FOUND',
  TRANSITION_STATEMENT_DUPLICATE: 'TRANSITION_STATEMENT_DUPLICATE',

  // ── SMS Gateway ────────────────────────────────────────────
  SMS_GATEWAY_NOT_CONFIGURED: 'SMS_GATEWAY_NOT_CONFIGURED',
  SMS_GATEWAY_DISABLED: 'SMS_GATEWAY_DISABLED',
  SMS_GATEWAY_ERROR: 'SMS_GATEWAY_ERROR',
  SMS_DAILY_LIMIT_EXCEEDED: 'SMS_DAILY_LIMIT_EXCEEDED',
  SMS_OPTED_OUT: 'SMS_OPTED_OUT',
  SMS_MESSAGE_NOT_FOUND: 'SMS_MESSAGE_NOT_FOUND',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',

  // Plan / Billing
  PLAN_LIMIT: 'PLAN_LIMIT',

  // Conflict
  CONFLICT: 'CONFLICT',

  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================
// Response Types
// ============================================================

export interface ActionResponse<T> {
  data: T | null;
  error: {
    message: string;
    code: string;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  error: {
    message: string;
    code: string;
  } | null;
}

// ============================================================
// Helper: Create success/error responses
// ============================================================

export function success<T>(data: T): ActionResponse<T> {
  return { data, error: null };
}

export function failure<T = never>(message: string, code: string = ErrorCodes.UNKNOWN_ERROR): ActionResponse<T> {
  return { data: null, error: { message, code } };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    error: null,
  };
}

export function paginatedFailure<T = never>(message: string, code: string = ErrorCodes.UNKNOWN_ERROR): PaginatedResponse<T> {
  return {
    data: [],
    pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    error: { message, code },
  };
}