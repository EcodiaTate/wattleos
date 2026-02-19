// ============================================================
// WattleOS V2 - Utility Functions
// ============================================================
// Pure functions with no side effects. Used across modules.
// ============================================================

/**
 * Format a student's display name.
 * Prefers preferred_name over first_name.
 */
export function formatStudentName(
  firstName: string,
  lastName: string,
  preferredName?: string | null,
): string {
  const displayFirst = preferredName || firstName;
  return `${displayFirst} ${lastName}`;
}

/**
 * Format a full name from first + last.
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

/**
 * Calculate age from date of birth.
 */
export function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format a date string for display (AU format: DD/MM/YYYY).
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a datetime string for display.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Validate pagination parameters and clamp to safe ranges.
 */
export function validatePagination(
  page: unknown,
  perPage: unknown,
  maxPerPage: number = 100,
): { page: number; perPage: number; offset: number } {
  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.min(maxPerPage, Math.max(1, Number(perPage) || 20));
  return {
    page: safePage,
    perPage: safePerPage,
    offset: (safePage - 1) * safePerPage,
  };
}

/**
 * Clamp a string to a maximum length, appending ellipsis if truncated.
 */
export function truncate(
  str: string | null | undefined,
  maxLength: number = 100,
): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Get severity badge color for medical conditions.
 */
export function severityColor(severity: string): string {
  switch (severity) {
    case "life_threatening":
      return "bg-red-100 text-red-800 border-red-200";
    case "severe":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "moderate":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "mild":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-muted text-gray-800 border-border";
  }
}

/**
 * Get enrollment status badge color.
 */
export function enrollmentStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "inquiry":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "applicant":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "withdrawn":
      return "bg-muted text-gray-800 border-border";
    case "graduated":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-muted text-gray-800 border-border";
  }
}
