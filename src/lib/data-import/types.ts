// src/lib/data-import/types.ts
//
// ============================================================
// WattleOS V2 - Data Import Type Definitions
// ============================================================
// WHY: Strict types for every stage of the import pipeline
// ensure we never pass unvalidated data to the database.
// Zero `any` - every CSV cell is parsed and typed before insert.
// ============================================================

// ============================================================
// Import Job Types
// ============================================================

export type ImportType =
  | "students"
  | "guardians"
  | "emergency_contacts"
  | "medical_conditions"
  | "staff"
  | "attendance";

export type ImportJobStatus =
  | "pending"
  | "validating"
  | "preview"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "rolled_back";

export type ImportRecordStatus = "pending" | "imported" | "skipped" | "error";

export interface ImportJob {
  id: string;
  tenant_id: string;
  created_by: string;
  import_type: ImportType;
  status: ImportJobStatus;
  file_name: string;
  column_mapping: Record<string, string>;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: ImportRowError[];
  metadata: ImportMetadata;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ImportJobRecord {
  id: string;
  tenant_id: string;
  import_job_id: string;
  row_number: number;
  status: ImportRecordStatus;
  entity_type: string;
  entity_id: string | null;
  raw_data: Record<string, string>;
  mapped_data: Record<string, string>;
  error_message: string | null;
  created_at: string;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportMetadata {
  source_platform?: string;
  default_class_id?: string;
  default_enrollment_status?: string;
  skip_duplicates?: boolean;
  duplicate_check_fields?: string[];
}

// ============================================================
// CSV Parsing Types
// ============================================================

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  raw_row_count: number;
}

export interface CSVParseError {
  row: number;
  message: string;
}

// ============================================================
// Column Mapping Types
// ============================================================

/**
 * Defines a field that a WattleOS entity expects.
 * Used to render the column mapping UI.
 */
export interface WattleField {
  key: string;
  label: string;
  required: boolean;
  description: string;
  example: string;
  /** Validator hint for the UI preview */
  type: "text" | "date" | "email" | "phone" | "enum" | "boolean";
  /** For enum type: allowed values */
  enum_values?: string[];
}

/**
 * Column mapping = { csvColumnHeader: wattleFieldKey }
 * e.g. { "Student First Name": "first_name", "DOB": "dob" }
 */
export type ColumnMapping = Record<string, string>;

/**
 * A suggested mapping based on fuzzy-matching CSV headers to WattleOS fields.
 * Confidence is 0-1. UI shows these as pre-selected if confidence > 0.7.
 */
export interface MappingSuggestion {
  csv_header: string;
  wattle_field: string;
  confidence: number;
}

// ============================================================
// Field Definitions per Import Type
// ============================================================

export const STUDENT_FIELDS: WattleField[] = [
  {
    key: "first_name",
    label: "First Name",
    required: true,
    description: "Student's legal first name",
    example: "Emma",
    type: "text",
  },
  {
    key: "last_name",
    label: "Last Name",
    required: true,
    description: "Student's legal last name",
    example: "Thompson",
    type: "text",
  },
  {
    key: "preferred_name",
    label: "Preferred Name",
    required: false,
    description: "Name the student goes by (if different from first name)",
    example: "Emmy",
    type: "text",
  },
  {
    key: "dob",
    label: "Date of Birth",
    required: false,
    description: "Accepted formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY",
    example: "15/03/2019",
    type: "date",
  },
  {
    key: "gender",
    label: "Gender",
    required: false,
    description: "Male, Female, Non-binary, or Other",
    example: "Female",
    type: "enum",
    enum_values: ["male", "female", "non-binary", "other"],
  },
  {
    key: "enrollment_status",
    label: "Enrollment Status",
    required: false,
    description:
      "Current status. Defaults to 'active' if blank. Options: inquiry, applicant, active, withdrawn, graduated",
    example: "active",
    type: "enum",
    enum_values: ["inquiry", "applicant", "active", "withdrawn", "graduated"],
  },
  {
    key: "class_name",
    label: "Class / Room Name",
    required: false,
    description:
      "Name of the class/room the student belongs to. Must match an existing class or will be created.",
    example: "Wattle Room",
    type: "text",
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    description: "Any additional notes about the student",
    example: "Loves dinosaurs. Transitioning from nap to rest time.",
    type: "text",
  },
];

export const GUARDIAN_FIELDS: WattleField[] = [
  {
    key: "student_first_name",
    label: "Student First Name",
    required: true,
    description: "First name of the student this guardian is linked to",
    example: "Emma",
    type: "text",
  },
  {
    key: "student_last_name",
    label: "Student Last Name",
    required: true,
    description: "Last name of the student this guardian is linked to",
    example: "Thompson",
    type: "text",
  },
  {
    key: "guardian_first_name",
    label: "Guardian First Name",
    required: true,
    description: "Guardian's first name",
    example: "Sarah",
    type: "text",
  },
  {
    key: "guardian_last_name",
    label: "Guardian Last Name",
    required: true,
    description: "Guardian's last name",
    example: "Thompson",
    type: "text",
  },
  {
    key: "guardian_email",
    label: "Guardian Email",
    required: true,
    description:
      "Email address. Used to create their account and link as parent.",
    example: "sarah.t@email.com",
    type: "email",
  },
  {
    key: "relationship",
    label: "Relationship",
    required: true,
    description: "Relationship to student: mother, father, grandparent, other",
    example: "mother",
    type: "enum",
    enum_values: [
      "mother",
      "father",
      "grandparent",
      "step-parent",
      "foster-parent",
      "other",
    ],
  },
  {
    key: "phone",
    label: "Phone Number",
    required: false,
    description: "Contact phone number",
    example: "0412 345 678",
    type: "phone",
  },
  {
    key: "is_primary",
    label: "Primary Contact",
    required: false,
    description: "Is this the primary guardian? yes/no/true/false",
    example: "yes",
    type: "boolean",
  },
  {
    key: "is_emergency_contact",
    label: "Emergency Contact",
    required: false,
    description: "Is this person an emergency contact? yes/no/true/false",
    example: "yes",
    type: "boolean",
  },
  {
    key: "pickup_authorized",
    label: "Pickup Authorized",
    required: false,
    description: "Authorized for pickup? Defaults to yes.",
    example: "yes",
    type: "boolean",
  },
];

export const EMERGENCY_CONTACT_FIELDS: WattleField[] = [
  {
    key: "student_first_name",
    label: "Student First Name",
    required: true,
    description: "First name of the student",
    example: "Emma",
    type: "text",
  },
  {
    key: "student_last_name",
    label: "Student Last Name",
    required: true,
    description: "Last name of the student",
    example: "Thompson",
    type: "text",
  },
  {
    key: "contact_name",
    label: "Contact Name",
    required: true,
    description: "Full name of the emergency contact",
    example: "Margaret Thompson",
    type: "text",
  },
  {
    key: "relationship",
    label: "Relationship",
    required: true,
    description: "Relationship to the student",
    example: "grandmother",
    type: "text",
  },
  {
    key: "phone_primary",
    label: "Primary Phone",
    required: true,
    description: "Main contact phone number",
    example: "0412 345 678",
    type: "phone",
  },
  {
    key: "phone_secondary",
    label: "Secondary Phone",
    required: false,
    description: "Backup phone number",
    example: "02 9876 5432",
    type: "phone",
  },
  {
    key: "email",
    label: "Email",
    required: false,
    description: "Email address",
    example: "margaret@email.com",
    type: "email",
  },
  {
    key: "priority_order",
    label: "Priority Order",
    required: false,
    description: "Call order priority. 1 = call first. Defaults to 1.",
    example: "1",
    type: "text",
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    description: "Additional notes",
    example: "Available after 3pm only",
    type: "text",
  },
];

export const MEDICAL_CONDITION_FIELDS: WattleField[] = [
  {
    key: "student_first_name",
    label: "Student First Name",
    required: true,
    description: "First name of the student",
    example: "Emma",
    type: "text",
  },
  {
    key: "student_last_name",
    label: "Student Last Name",
    required: true,
    description: "Last name of the student",
    example: "Thompson",
    type: "text",
  },
  {
    key: "condition_type",
    label: "Condition Type",
    required: true,
    description: "Type: allergy, asthma, epilepsy, diabetes, other",
    example: "allergy",
    type: "enum",
    enum_values: ["allergy", "asthma", "epilepsy", "diabetes", "other"],
  },
  {
    key: "condition_name",
    label: "Condition Name",
    required: true,
    description: "Specific condition name",
    example: "Peanut allergy",
    type: "text",
  },
  {
    key: "severity",
    label: "Severity",
    required: true,
    description: "Severity level: mild, moderate, severe, life_threatening",
    example: "severe",
    type: "enum",
    enum_values: ["mild", "moderate", "severe", "life_threatening"],
  },
  {
    key: "description",
    label: "Description",
    required: false,
    description: "Additional details about the condition",
    example: "Anaphylactic reaction to all tree nuts",
    type: "text",
  },
  {
    key: "action_plan",
    label: "Action Plan",
    required: false,
    description: "Written instructions for staff in an emergency",
    example: "Administer EpiPen immediately, call 000",
    type: "text",
  },
  {
    key: "requires_medication",
    label: "Requires Medication",
    required: false,
    description: "Does this condition require medication on-site? yes/no",
    example: "yes",
    type: "boolean",
  },
  {
    key: "medication_name",
    label: "Medication Name",
    required: false,
    description: "Name of medication if required",
    example: "EpiPen",
    type: "text",
  },
  {
    key: "medication_location",
    label: "Medication Location",
    required: false,
    description: "Where is the medication stored?",
    example: "Office first aid kit",
    type: "text",
  },
];

export const STAFF_FIELDS: WattleField[] = [
  {
    key: "first_name",
    label: "First Name",
    required: true,
    description: "Staff member's first name",
    example: "Maria",
    type: "text",
  },
  {
    key: "last_name",
    label: "Last Name",
    required: true,
    description: "Staff member's last name",
    example: "Montessori",
    type: "text",
  },
  {
    key: "email",
    label: "Email",
    required: true,
    description: "Email address. An invitation will be sent to this address.",
    example: "maria@school.edu.au",
    type: "email",
  },
  {
    key: "role",
    label: "Role",
    required: true,
    description:
      "Their role at the school. Must match an existing role name exactly.",
    example: "Guide",
    type: "text",
  },
];

export const ATTENDANCE_FIELDS: WattleField[] = [
  {
    key: "student_first_name",
    label: "Student First Name",
    required: true,
    description: "First name of the student",
    example: "Emma",
    type: "text",
  },
  {
    key: "student_last_name",
    label: "Student Last Name",
    required: true,
    description: "Last name of the student",
    example: "Thompson",
    type: "text",
  },
  {
    key: "date",
    label: "Date",
    required: true,
    description: "Attendance date. Formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY",
    example: "15/03/2024",
    type: "date",
  },
  {
    key: "status",
    label: "Status",
    required: true,
    description: "Attendance status: present, absent, late, excused, half_day",
    example: "present",
    type: "enum",
    enum_values: ["present", "absent", "late", "excused", "half_day"],
  },
  {
    key: "class_name",
    label: "Class / Room",
    required: false,
    description: "Name of the class/room. Optional - links attendance to a class.",
    example: "Wattle Room",
    type: "text",
  },
  {
    key: "check_in_time",
    label: "Check-in Time",
    required: false,
    description: "Time the student checked in. Format: HH:MM or HH:MM AM/PM",
    example: "8:30",
    type: "text",
  },
  {
    key: "check_out_time",
    label: "Check-out Time",
    required: false,
    description: "Time the student checked out. Format: HH:MM or HH:MM AM/PM",
    example: "15:30",
    type: "text",
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    description: "Any notes about this attendance record",
    example: "Parent called to report illness",
    type: "text",
  },
];

/**
 * Registry mapping import types to their field definitions.
 */
export const IMPORT_FIELD_REGISTRY: Record<ImportType, WattleField[]> = {
  students: STUDENT_FIELDS,
  guardians: GUARDIAN_FIELDS,
  emergency_contacts: EMERGENCY_CONTACT_FIELDS,
  medical_conditions: MEDICAL_CONDITION_FIELDS,
  staff: STAFF_FIELDS,
  attendance: ATTENDANCE_FIELDS,
};

// ============================================================
// Validation Result Types
// ============================================================

export interface ValidationResult {
  is_valid: boolean;
  rows: ValidatedRow[];
  summary: ValidationSummary;
}

export interface ValidatedRow {
  row_number: number;
  raw_data: Record<string, string>;
  mapped_data: Record<string, string>;
  is_valid: boolean;
  errors: ImportRowError[];
  warnings: ImportRowError[];
  /** If this row is a duplicate of an existing record */
  is_duplicate: boolean;
}

export interface ValidationSummary {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  warning_rows: number;
  duplicate_rows: number;
  /** Grouped error counts by field for quick overview */
  errors_by_field: Record<string, number>;
}

// ============================================================
// Import Wizard Step Types (for UI state)
// ============================================================

export type ImportWizardStep =
  | "select_type"
  | "upload"
  | "map_columns"
  | "preview"
  | "importing"
  | "results";

export interface ImportWizardState {
  step: ImportWizardStep;
  import_type: ImportType | null;
  file_name: string | null;
  parsed_csv: ParsedCSV | null;
  column_mapping: ColumnMapping;
  mapping_suggestions: MappingSuggestion[];
  validation_result: ValidationResult | null;
  import_job_id: string | null;
  import_job: ImportJob | null;
}