// src/lib/data-import/csv-parser.ts
//
// ============================================================
// WattleOS V2 - CSV Parser (Client-Side)
// ============================================================
// WHY: Runs in-browser so we never upload raw CSV files to
// our server. Handles RFC 4180 edge cases: quoted fields,
// embedded commas, newlines inside quotes, BOM stripping.
// Zero external dependencies - just string parsing.
// ============================================================

import type { ParsedCSV, CSVParseError, WattleField, MappingSuggestion } from "./types";

/**
 * Maximum rows we'll accept in a single import.
 * Safety valve to prevent browser tab crashes.
 * Attendance gets a higher limit since historical imports can be large.
 */
const MAX_ROWS = 10000;

/**
 * Parse a CSV string into structured data.
 * Handles:
 * - RFC 4180 quoting (fields with commas, newlines, quotes)
 * - UTF-8 BOM stripping
 * - Windows (CRLF) and Unix (LF) line endings
 * - Trailing empty rows
 * - Whitespace trimming on values
 */
export function parseCSV(raw: string): {
  data: ParsedCSV | null;
  error: string | null;
} {
  // Strip UTF-8 BOM if present
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  if (cleaned.trim().length === 0) {
    return { data: null, error: "The file appears to be empty." };
  }

  // Detect delimiter: comma vs semicolon vs tab
  const delimiter = detectDelimiter(cleaned);

  const allRows = parseRows(cleaned, delimiter);

  if (allRows.length === 0) {
    return { data: null, error: "No data found in file." };
  }

  const headers = allRows[0].map((h) => h.trim());

  // Check for empty or duplicate headers
  const emptyHeaders = headers.filter((h) => h === "");
  if (emptyHeaders.length > 0) {
    return {
      data: null,
      error: `Found ${emptyHeaders.length} empty column header(s). Every column must have a header name.`,
    };
  }

  const duplicateHeaders = headers.filter(
    (h, i) => headers.indexOf(h) !== i
  );
  if (duplicateHeaders.length > 0) {
    return {
      data: null,
      error: `Duplicate column headers found: ${[...new Set(duplicateHeaders)].join(", ")}. Each column must have a unique name.`,
    };
  }

  // Parse data rows (skip header)
  const dataRows = allRows
    .slice(1)
    .filter((row) => {
      // Filter out completely empty rows
      return row.some((cell) => cell.trim() !== "");
    })
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        record[header] = (row[i] ?? "").trim();
      });
      return record;
    });

  if (dataRows.length === 0) {
    return {
      data: null,
      error: "The file has headers but no data rows.",
    };
  }

  if (dataRows.length > MAX_ROWS) {
    return {
      data: null,
      error: `Too many rows (${dataRows.length}). Maximum is ${MAX_ROWS} rows per import. Please split your file.`,
    };
  }

  return {
    data: {
      headers,
      rows: dataRows,
      raw_row_count: dataRows.length,
    },
    error: null,
  };
}

/**
 * Detect the most likely delimiter by counting occurrences in the first line.
 */
function detectDelimiter(text: string): string {
  // Get the first line (not inside quotes)
  const firstLine = text.split("\n")[0] ?? "";

  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
  if (semicolonCount > commaCount) return ";";
  return ",";
}

/**
 * RFC 4180-compliant CSV row parser.
 * Handles quoted fields, embedded delimiters, and embedded newlines.
 */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : null;

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("") → literal "
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i += 1;
        }
      } else {
        currentField += char;
        i += 1;
      }
    } else {
      if (char === '"' && currentField === "") {
        // Start of quoted field
        inQuotes = true;
        i += 1;
      } else if (char === delimiter) {
        // Field separator
        currentRow.push(currentField);
        currentField = "";
        i += 1;
      } else if (char === "\r" && nextChar === "\n") {
        // CRLF line ending
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i += 2;
      } else if (char === "\n") {
        // LF line ending
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i += 1;
      } else {
        currentField += char;
        i += 1;
      }
    }
  }

  // Don't forget the last field/row
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// ============================================================
// Smart Column Mapping Suggestions
// ============================================================

/**
 * Common aliases for WattleOS fields across different platforms.
 * Built from analysis of Transparent Classroom, Storypark, FACTS SIS,
 * Xplor, and common attendance system export formats.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  // Student fields
  first_name: [
    "first name",
    "first_name",
    "firstname",
    "given name",
    "given_name",
    "child first name",
    "child_first_name",
    "student first name",
    "forename",
    "fname",
  ],
  last_name: [
    "last name",
    "last_name",
    "lastname",
    "surname",
    "family name",
    "family_name",
    "child last name",
    "child_last_name",
    "student last name",
    "lname",
  ],
  preferred_name: [
    "preferred name",
    "preferred_name",
    "nickname",
    "known as",
    "goes by",
    "display name",
  ],
  dob: [
    "date of birth",
    "date_of_birth",
    "dob",
    "birth date",
    "birthdate",
    "birthday",
    "birth_date",
    "d.o.b",
    "d.o.b.",
  ],
  gender: ["gender", "sex", "child gender"],
  enrollment_status: [
    "enrollment status",
    "enrollment_status",
    "enrolment status",
    "enrolment_status",
    "status",
    "student status",
  ],
  class_name: [
    "class",
    "class name",
    "class_name",
    "classroom",
    "room",
    "room name",
    "room_name",
    "environment",
    "level",
    "group",
  ],
  notes: ["notes", "comments", "additional info", "additional_info", "memo"],

  // Guardian fields
  student_first_name: [
    "student first name",
    "child first name",
    "child_first_name",
    "student_first_name",
  ],
  student_last_name: [
    "student last name",
    "child last name",
    "child_last_name",
    "student_last_name",
  ],
  guardian_first_name: [
    "parent first name",
    "guardian first name",
    "parent_first_name",
    "guardian_first_name",
    "carer first name",
    "parent firstname",
    "family member first name",
  ],
  guardian_last_name: [
    "parent last name",
    "guardian last name",
    "parent_last_name",
    "guardian_last_name",
    "carer last name",
    "parent lastname",
    "family member last name",
  ],
  guardian_email: [
    "parent email",
    "guardian email",
    "parent_email",
    "guardian_email",
    "carer email",
    "family email",
    "email",
    "email address",
  ],
  relationship: [
    "relationship",
    "relation",
    "relationship to child",
    "relationship_to_child",
    "relation to student",
    "type",
    "contact type",
  ],
  phone: [
    "phone",
    "phone number",
    "phone_number",
    "mobile",
    "mobile number",
    "mobile_number",
    "cell",
    "cell phone",
    "telephone",
    "contact number",
  ],
  is_primary: [
    "primary",
    "is primary",
    "is_primary",
    "primary contact",
    "primary_contact",
    "main contact",
  ],
  is_emergency_contact: [
    "emergency contact",
    "is emergency contact",
    "is_emergency_contact",
    "emergency",
  ],
  pickup_authorized: [
    "pickup authorized",
    "pickup_authorized",
    "authorised pickup",
    "authorized pickup",
    "can pickup",
    "can_pickup",
  ],

  // Emergency contact fields
  contact_name: [
    "contact name",
    "contact_name",
    "name",
    "full name",
    "full_name",
    "emergency contact name",
  ],
  phone_primary: [
    "primary phone",
    "phone_primary",
    "phone 1",
    "phone1",
    "main phone",
    "home phone",
    "phone",
    "mobile",
  ],
  phone_secondary: [
    "secondary phone",
    "phone_secondary",
    "phone 2",
    "phone2",
    "work phone",
    "alt phone",
    "alternate phone",
  ],
  email: ["email", "email address", "email_address", "e-mail"],
  priority_order: [
    "priority",
    "priority order",
    "priority_order",
    "order",
    "call order",
    "call_order",
    "rank",
  ],

  // Medical fields
  condition_type: [
    "condition type",
    "condition_type",
    "type",
    "medical type",
    "category",
  ],
  condition_name: [
    "condition name",
    "condition_name",
    "condition",
    "allergy",
    "medical condition",
    "diagnosis",
  ],
  severity: ["severity", "severity level", "severity_level", "risk level"],
  description: ["description", "details", "info", "information"],
  action_plan: [
    "action plan",
    "action_plan",
    "management plan",
    "emergency plan",
    "treatment plan",
    "plan",
  ],
  requires_medication: [
    "requires medication",
    "requires_medication",
    "medication required",
    "needs medication",
    "medicated",
  ],
  medication_name: [
    "medication name",
    "medication_name",
    "medication",
    "medicine",
    "drug",
  ],
  medication_location: [
    "medication location",
    "medication_location",
    "storage location",
    "where stored",
    "location",
  ],

  // Staff fields
  role: [
    "role",
    "job title",
    "job_title",
    "position",
    "title",
    "staff role",
    "staff_role",
  ],

  // Attendance fields
  date: [
    "date",
    "attendance date",
    "attendance_date",
    "day",
    "record date",
    "session date",
  ],
  status: [
    "status",
    "attendance status",
    "attendance_status",
    "attendance",
    "mark",
    "code",
    "attendance code",
    "attendance type",
  ],
  check_in_time: [
    "check in",
    "check_in",
    "check-in",
    "checkin",
    "check in time",
    "check_in_time",
    "arrival",
    "arrival time",
    "sign in",
    "sign_in",
    "time in",
  ],
  check_out_time: [
    "check out",
    "check_out",
    "check-out",
    "checkout",
    "check out time",
    "check_out_time",
    "departure",
    "departure time",
    "sign out",
    "sign_out",
    "time out",
  ],
};

/**
 * Suggest column mappings by fuzzy-matching CSV headers against known aliases.
 * Returns suggestions sorted by confidence (highest first).
 */
export function suggestColumnMapping(
  csvHeaders: string[],
  wattleFields: WattleField[]
): MappingSuggestion[] {
  const suggestions: MappingSuggestion[] = [];
  const usedWattleFields = new Set<string>();

  for (const csvHeader of csvHeaders) {
    const normalized = csvHeader.toLowerCase().trim();
    let bestMatch: { field: string; confidence: number } | null = null;

    for (const wattleField of wattleFields) {
      // Skip if this wattle field was already matched with higher confidence
      if (usedWattleFields.has(wattleField.key)) continue;

      const aliases = FIELD_ALIASES[wattleField.key] ?? [];

      // Exact match on key
      if (normalized === wattleField.key) {
        bestMatch = { field: wattleField.key, confidence: 1.0 };
        break;
      }

      // Exact match on any alias
      if (aliases.includes(normalized)) {
        bestMatch = { field: wattleField.key, confidence: 0.95 };
        break;
      }

      // Partial match: CSV header contains alias or vice versa
      for (const alias of aliases) {
        if (normalized.includes(alias) || alias.includes(normalized)) {
          const score = Math.min(normalized.length, alias.length) /
            Math.max(normalized.length, alias.length);
          if (!bestMatch || score > bestMatch.confidence) {
            bestMatch = { field: wattleField.key, confidence: score * 0.85 };
          }
        }
      }

      // Label match
      const normalizedLabel = wattleField.label.toLowerCase();
      if (normalized === normalizedLabel) {
        bestMatch = { field: wattleField.key, confidence: 0.9 };
        break;
      }
    }

    if (bestMatch && bestMatch.confidence > 0.4) {
      suggestions.push({
        csv_header: csvHeader,
        wattle_field: bestMatch.field,
        confidence: bestMatch.confidence,
      });
      usedWattleFields.add(bestMatch.field);
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================
// CSV Template Generator
// ============================================================

/**
 * Generate a downloadable CSV template for a given import type.
 * Returns a CSV string with headers and 2 example rows.
 */
export function generateCSVTemplate(fields: WattleField[]): string {
  const headers = fields.map((f) => f.label);
  const examples = fields.map((f) => f.example);

  const escapeCSV = (val: string): string => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerRow = headers.map(escapeCSV).join(",");
  const exampleRow = examples.map(escapeCSV).join(",");

  return `${headerRow}\n${exampleRow}\n`;
}