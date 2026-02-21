// src/lib/data-import/validators.ts
//
// ============================================================
// WattleOS V2 - Import Data Validators
// ============================================================
// WHY: Validates every row BEFORE database insertion. Catches
// bad dates, missing required fields, invalid enums, and
// duplicate records. Runs server-side so it can check against
// existing tenant data (e.g. "does this student already exist?").
// ============================================================

import type {
  ImportType,
  ColumnMapping,
  WattleField,
  ValidatedRow,
  ValidationResult,
  ValidationSummary,
  ImportRowError,
  ParsedCSV,
} from "./types";
import { IMPORT_FIELD_REGISTRY } from "./types";

// ============================================================
// Main Validation Entry Point
// ============================================================

export interface ExistingData {
  /** Existing student names for duplicate detection: "firstname|lastname" lowercased */
  student_names: Set<string>;
  /** Existing class names (lowercased) mapped to their IDs */
  class_names: Map<string, string>;
  /** Existing guardian emails (lowercased) */
  guardian_emails: Set<string>;
  /** Existing role names (lowercased) mapped to their IDs */
  role_names: Map<string, string>;
  /** Existing attendance keys for duplicate detection: "studentid|date" */
  attendance_keys?: Set<string>;
}

/**
 * Validate an entire parsed CSV against field definitions and existing data.
 * Returns a ValidationResult with per-row details for preview.
 */
export function validateImport(
  importType: ImportType,
  parsedCSV: ParsedCSV,
  columnMapping: ColumnMapping,
  existingData: ExistingData
): ValidationResult {
  const fields = IMPORT_FIELD_REGISTRY[importType];
  const rows: ValidatedRow[] = [];

  // Track in-file duplicates for student imports
  const seenInFile = new Set<string>();

  for (let i = 0; i < parsedCSV.rows.length; i++) {
    const rawRow = parsedCSV.rows[i];
    const rowNumber = i + 1; // 1-indexed for user display

    // Apply column mapping to transform raw CSV data → WattleOS fields
    const mappedData: Record<string, string> = {};
    for (const [csvHeader, wattleKey] of Object.entries(columnMapping)) {
      if (wattleKey && rawRow[csvHeader] !== undefined) {
        mappedData[wattleKey] = rawRow[csvHeader];
      }
    }

    const errors: ImportRowError[] = [];
    const warnings: ImportRowError[] = [];
    let isDuplicate = false;

    // Validate required fields
    for (const field of fields) {
      if (field.required) {
        const value = (mappedData[field.key] ?? "").trim();
        if (value === "") {
          errors.push({
            row: rowNumber,
            field: field.key,
            message: `${field.label} is required`,
          });
        }
      }
    }

    // Validate field types
    for (const field of fields) {
      const value = (mappedData[field.key] ?? "").trim();
      if (value === "") continue; // Skip empty optional fields

      switch (field.type) {
        case "date": {
          const parsed = parseFlexibleDate(value);
          if (!parsed) {
            errors.push({
              row: rowNumber,
              field: field.key,
              message: `Invalid date format "${value}". Use DD/MM/YYYY, YYYY-MM-DD, or MM/DD/YYYY`,
            });
          } else {
            // Normalize to ISO format
            mappedData[field.key] = parsed;
          }
          break;
        }
        case "email": {
          if (!isValidEmail(value)) {
            errors.push({
              row: rowNumber,
              field: field.key,
              message: `Invalid email address "${value}"`,
            });
          } else {
            mappedData[field.key] = value.toLowerCase().trim();
          }
          break;
        }
        case "enum": {
          // For attendance status, use the expanded normalizer
          if (importType === "attendance" && field.key === "status") {
            const normalizedStatus = normalizeAttendanceStatus(value);
            if (!normalizedStatus) {
              errors.push({
                row: rowNumber,
                field: field.key,
                message: `Invalid attendance status "${value}". Must be one of: present, absent, late, excused, half_day`,
              });
            } else {
              mappedData[field.key] = normalizedStatus;
            }
          } else {
            const normalizedValue = normalizeEnumValue(
              value,
              field.enum_values ?? []
            );
            if (!normalizedValue) {
              errors.push({
                row: rowNumber,
                field: field.key,
                message: `Invalid value "${value}". Must be one of: ${(field.enum_values ?? []).join(", ")}`,
              });
            } else {
              mappedData[field.key] = normalizedValue;
            }
          }
          break;
        }
        case "boolean": {
          const boolValue = parseBoolean(value);
          if (boolValue === null) {
            errors.push({
              row: rowNumber,
              field: field.key,
              message: `Invalid boolean value "${value}". Use yes/no, true/false, or 1/0`,
            });
          } else {
            mappedData[field.key] = boolValue ? "true" : "false";
          }
          break;
        }
        case "phone": {
          // Normalize phone: strip spaces, ensure starts with 0 or +
          mappedData[field.key] = normalizePhone(value);
          break;
        }
        // text: no validation beyond required check
      }
    }

    // Import-type-specific validation
    switch (importType) {
      case "students": {
        const nameKey = `${(mappedData.first_name ?? "").toLowerCase()}|${(mappedData.last_name ?? "").toLowerCase()}`;

        // Check for in-file duplicate
        if (seenInFile.has(nameKey) && nameKey !== "|") {
          warnings.push({
            row: rowNumber,
            field: "first_name",
            message: `Duplicate student "${mappedData.first_name} ${mappedData.last_name}" appears multiple times in this file`,
          });
        }
        seenInFile.add(nameKey);

        // Check against existing students
        if (existingData.student_names.has(nameKey) && nameKey !== "|") {
          isDuplicate = true;
          warnings.push({
            row: rowNumber,
            field: "first_name",
            message: `Student "${mappedData.first_name} ${mappedData.last_name}" already exists in the system`,
          });
        }

        // Check class exists (if mapped)
        if (mappedData.class_name) {
          const classLower = mappedData.class_name.toLowerCase();
          if (!existingData.class_names.has(classLower)) {
            warnings.push({
              row: rowNumber,
              field: "class_name",
              message: `Class "${mappedData.class_name}" doesn't exist and will be created`,
            });
          }
        }
        break;
      }
      case "guardians": {
        // Validate student exists
        const studentKey = `${(mappedData.student_first_name ?? "").toLowerCase()}|${(mappedData.student_last_name ?? "").toLowerCase()}`;
        if (
          studentKey !== "|" &&
          !existingData.student_names.has(studentKey)
        ) {
          errors.push({
            row: rowNumber,
            field: "student_first_name",
            message: `Student "${mappedData.student_first_name} ${mappedData.student_last_name}" not found. Import students first.`,
          });
        }

        // Check for duplicate guardian email
        if (mappedData.guardian_email) {
          const emailLower = mappedData.guardian_email.toLowerCase();
          if (existingData.guardian_emails.has(emailLower)) {
            warnings.push({
              row: rowNumber,
              field: "guardian_email",
              message: `Email "${mappedData.guardian_email}" already exists. Will link existing account to this student.`,
            });
          }
        }
        break;
      }
      case "emergency_contacts": {
        const studentKey = `${(mappedData.student_first_name ?? "").toLowerCase()}|${(mappedData.student_last_name ?? "").toLowerCase()}`;
        if (
          studentKey !== "|" &&
          !existingData.student_names.has(studentKey)
        ) {
          errors.push({
            row: rowNumber,
            field: "student_first_name",
            message: `Student "${mappedData.student_first_name} ${mappedData.student_last_name}" not found. Import students first.`,
          });
        }
        break;
      }
      case "medical_conditions": {
        const studentKey = `${(mappedData.student_first_name ?? "").toLowerCase()}|${(mappedData.student_last_name ?? "").toLowerCase()}`;
        if (
          studentKey !== "|" &&
          !existingData.student_names.has(studentKey)
        ) {
          errors.push({
            row: rowNumber,
            field: "student_first_name",
            message: `Student "${mappedData.student_first_name} ${mappedData.student_last_name}" not found. Import students first.`,
          });
        }
        break;
      }
      case "staff": {
        if (mappedData.role) {
          const roleLower = mappedData.role.toLowerCase();
          if (!existingData.role_names.has(roleLower)) {
            errors.push({
              row: rowNumber,
              field: "role",
              message: `Role "${mappedData.role}" doesn't exist. Available roles: ${[...existingData.role_names.keys()].join(", ")}`,
            });
          }
        }
        break;
      }
      case "attendance": {
        // Validate student exists
        const studentKey = `${(mappedData.student_first_name ?? "").toLowerCase()}|${(mappedData.student_last_name ?? "").toLowerCase()}`;
        if (
          studentKey !== "|" &&
          !existingData.student_names.has(studentKey)
        ) {
          errors.push({
            row: rowNumber,
            field: "student_first_name",
            message: `Student "${mappedData.student_first_name} ${mappedData.student_last_name}" not found. Import students first.`,
          });
        }

        // Validate date isn't in the future
        if (mappedData.date) {
          const today = new Date().toISOString().split("T")[0];
          if (mappedData.date > today) {
            warnings.push({
              row: rowNumber,
              field: "date",
              message: `Date ${mappedData.date} is in the future - intentional?`,
            });
          }
        }

        // Check class exists (if provided)
        if (mappedData.class_name) {
          const classLower = mappedData.class_name.toLowerCase();
          if (!existingData.class_names.has(classLower)) {
            warnings.push({
              row: rowNumber,
              field: "class_name",
              message: `Class "${mappedData.class_name}" doesn't exist. Attendance will be recorded without a class link.`,
            });
          }
        }

        // Validate time formats
        if (mappedData.check_in_time) {
          const parsed = parseTimeString(mappedData.check_in_time);
          if (!parsed) {
            warnings.push({
              row: rowNumber,
              field: "check_in_time",
              message: `Invalid time format "${mappedData.check_in_time}". Use HH:MM or HH:MM AM/PM. Will be skipped.`,
            });
          }
        }
        if (mappedData.check_out_time) {
          const parsed = parseTimeString(mappedData.check_out_time);
          if (!parsed) {
            warnings.push({
              row: rowNumber,
              field: "check_out_time",
              message: `Invalid time format "${mappedData.check_out_time}". Use HH:MM or HH:MM AM/PM. Will be skipped.`,
            });
          }
        }

        // Duplicate detection: same student + same date in file
        const attendanceKey = `${studentKey}|${mappedData.date ?? ""}`;
        if (seenInFile.has(attendanceKey) && attendanceKey !== "||") {
          warnings.push({
            row: rowNumber,
            field: "date",
            message: `Duplicate attendance record for this student on ${mappedData.date}. Later row will overwrite.`,
          });
        }
        seenInFile.add(attendanceKey);

        // Check against existing attendance records
        if (existingData.attendance_keys?.has(attendanceKey)) {
          isDuplicate = true;
          warnings.push({
            row: rowNumber,
            field: "date",
            message: `Attendance record already exists for this student on ${mappedData.date}. Will be overwritten.`,
          });
        }
        break;
      }
    }

    rows.push({
      row_number: rowNumber,
      raw_data: rawRow,
      mapped_data: mappedData,
      is_valid: errors.length === 0,
      errors,
      warnings,
      is_duplicate: isDuplicate,
    });
  }

  // Build summary
  const summary = buildSummary(rows);

  return {
    is_valid: summary.error_rows === 0,
    rows,
    summary,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function buildSummary(rows: ValidatedRow[]): ValidationSummary {
  const errorsByField: Record<string, number> = {};

  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;
  let duplicateRows = 0;

  for (const row of rows) {
    if (row.is_valid) validRows++;
    if (row.errors.length > 0) errorRows++;
    if (row.warnings.length > 0) warningRows++;
    if (row.is_duplicate) duplicateRows++;

    for (const err of row.errors) {
      errorsByField[err.field] = (errorsByField[err.field] ?? 0) + 1;
    }
  }

  return {
    total_rows: rows.length,
    valid_rows: validRows,
    error_rows: errorRows,
    warning_rows: warningRows,
    duplicate_rows: duplicateRows,
    errors_by_field: errorsByField,
  };
}

/**
 * Parse dates in multiple formats common in Australian school exports.
 * Returns ISO date string (YYYY-MM-DD) or null if invalid.
 */
export function parseFlexibleDate(value: string): string | null {
  const trimmed = value.trim();

  // Try ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    if (isValidDate(y, m, d)) return trimmed;
    return null;
  }

  // Try DD/MM/YYYY (Australian standard)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split("/").map(Number);
    const [d, m, y] = parts;
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    // Try as MM/DD/YYYY (American format) if DD/MM didn't work
    const [m2, d2, y2] = parts;
    if (isValidDate(y2, m2, d2)) {
      return `${y2}-${String(m2).padStart(2, "0")}-${String(d2).padStart(2, "0")}`;
    }
    return null;
  }

  // Try DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-").map(Number);
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return null;
  }

  // Try DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split(".").map(Number);
    if (isValidDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return null;
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Normalize an enum value by trying exact match, then case-insensitive,
 * then common synonyms.
 */
function normalizeEnumValue(
  value: string,
  allowed: string[]
): string | null {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // Exact match
  if (allowed.includes(trimmed)) return trimmed;

  // Case-insensitive match
  const caseMatch = allowed.find((a) => a.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  // Common synonyms
  const synonyms: Record<string, string> = {
    m: "male",
    f: "female",
    male: "male",
    female: "female",
    boy: "male",
    girl: "female",
    nb: "non-binary",
    nonbinary: "non-binary",
    "non binary": "non-binary",
    x: "other",
    unknown: "other",
    unspecified: "other",
    enrolled: "active",
    current: "active",
    left: "withdrawn",
    departed: "withdrawn",
    alumnus: "graduated",
    alumni: "graduated",
    completed: "graduated",
    prospect: "inquiry",
    enquiry: "inquiry",
    pending: "applicant",
    applied: "applicant",
    life_threatening: "life_threatening",
    "life threatening": "life_threatening",
    critical: "life_threatening",
    anaphylaxis: "life_threatening",
    anaphylactic: "life_threatening",
    mild: "mild",
    moderate: "moderate",
    severe: "severe",
    high: "severe",
    low: "mild",
    medium: "moderate",
    mum: "mother",
    mom: "mother",
    dad: "father",
    grandma: "grandparent",
    grandmother: "grandparent",
    grandpa: "grandparent",
    grandfather: "grandparent",
    nana: "grandparent",
    nan: "grandparent",
    pop: "grandparent",
    step_parent: "step-parent",
    "step parent": "step-parent",
    stepparent: "step-parent",
    stepmom: "step-parent",
    stepdad: "step-parent",
    foster_parent: "foster-parent",
    "foster parent": "foster-parent",
    carer: "other",
    guardian: "other",
    relative: "other",
    aunt: "other",
    uncle: "other",
  };

  const synonym = synonyms[lower];
  if (synonym && allowed.includes(synonym)) return synonym;

  return null;
}

/**
 * Normalize attendance status values from various systems.
 * WHY separate from normalizeEnumValue: Attendance systems use
 * wildly different codes (P, A, L, checkmarks, etc.) that don't
 * map well through the generic synonym approach.
 */
function normalizeAttendanceStatus(value: string): string | null {
  const lower = value.toLowerCase().trim();

  const map: Record<string, string> = {
    // Present
    present: "present",
    p: "present",
    attended: "present",
    in: "present",
    yes: "present",
    "✓": "present",
    "✔": "present",

    // Absent
    absent: "absent",
    a: "absent",
    away: "absent",
    no: "absent",
    missing: "absent",
    "✗": "absent",
    "✘": "absent",
    x: "absent",

    // Late
    late: "late",
    l: "late",
    tardy: "late",
    "late arrival": "late",
    "arrived late": "late",

    // Excused
    excused: "excused",
    e: "excused",
    "excused absence": "excused",
    "excused absent": "excused",
    sick: "excused",
    illness: "excused",
    medical: "excused",
    holiday: "excused",

    // Half day
    half_day: "half_day",
    "half day": "half_day",
    half: "half_day",
    h: "half_day",
    partial: "half_day",
    "half-day": "half_day",
    "am only": "half_day",
    "pm only": "half_day",
  };

  return map[lower] ?? null;
}

/**
 * Parse boolean-like values from various CSV formats.
 */
function parseBoolean(value: string): boolean | null {
  const lower = value.trim().toLowerCase();
  if (["yes", "true", "1", "y", "on"].includes(lower)) return true;
  if (["no", "false", "0", "n", "off", ""].includes(lower)) return false;
  return null;
}

/**
 * Normalize Australian phone numbers.
 * Strips spaces, dashes, parentheses. Preserves leading 0 or + prefix.
 */
function normalizePhone(value: string): string {
  return value.replace(/[\s\-()]/g, "").trim();
}

/**
 * Parse time strings into HH:MM format.
 * Accepts: HH:MM, H:MM, HH:MM AM/PM, H AM/PM
 */
function parseTimeString(value: string): string | null {
  const trimmed = value.trim();

  // HH:MM (24-hour)
  let match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  // HH:MM AM/PM
  match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toLowerCase();

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  // Just an hour number
  match = trimmed.match(/^(\d{1,2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    if (hours >= 0 && hours < 24) {
      return `${String(hours).padStart(2, "0")}:00`;
    }
  }

  return null;
}