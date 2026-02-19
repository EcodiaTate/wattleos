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

  // CRUD
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CREATE_FAILED: 'CREATE_FAILED',
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