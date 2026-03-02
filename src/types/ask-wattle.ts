// src/types/ask-wattle.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Domain Types
// ============================================================
// The contract between the doc_chunks schema and the application.
// These types are canonical - generated Supabase types supplement
// but never override them.
//
// WHY explicit source metadata in SearchResult: The match_doc_chunks
// RPC returns a flat join of chunks + sources. We type the full
// shape here so the RAG pipeline and UI never deal with raw `any`.
// ============================================================

// ============================================================
// Document Source (a page or article in the docs)
// ============================================================

export type DocCategory =
  | "getting-started"
  | "guides"
  | "admin"
  | "curriculum"
  | "observations"
  | "attendance"
  | "reports"
  | "communications"
  | "billing"
  | "programs"
  | "enrollment"
  | "parent-portal"
  | "troubleshooting"
  | "api"
  | "general";

export interface DocSource {
  id: string;
  slug: string;
  title: string;
  category: DocCategory;
  source_url: string | null;
  content_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Document Chunk (the searchable unit)
// ============================================================

export interface DocChunkMetadata {
  /** Breadcrumb path, e.g. ["Attendance", "Roll Call", "Marking Late"] */
  breadcrumbs?: string[];
  /** The H1 of the source page */
  page_title?: string;
  /** Tags for boosting relevance */
  tags?: string[];
  /** Target audience: guide, parent, admin, all */
  audience?: ("guide" | "parent" | "admin" | "all")[];
}

export interface DocChunk {
  id: string;
  source_id: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  token_count: number;
  embedding: number[] | null;
  metadata: DocChunkMetadata;
  created_at: string;
}

// ============================================================
// Search Result (returned by match_doc_chunks RPC)
// ============================================================

export interface DocSearchResult {
  id: string;
  source_id: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  token_count: number;
  metadata: DocChunkMetadata;
  source_slug: string;
  source_title: string;
  source_category: string;
  source_url: string | null;
  similarity: number;
}

// ============================================================
// Conversation & Messages
// ============================================================

export interface AskWattleConversation {
  id: string;
  tenant_id: string | null;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant";
export type MessageFeedback = "helpful" | "not_helpful" | null;

export interface MessageSource {
  slug: string;
  title: string;
  category: string;
  url: string | null;
  heading: string | null;
  similarity: number;
}

export interface AskWattleMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: MessageSource[];
  feedback: MessageFeedback;
  created_at: string;
}

// ============================================================
// Ingest Pipeline Types
// ============================================================

export interface ChunkInput {
  heading: string | null;
  content: string;
  chunk_index: number;
  metadata: DocChunkMetadata;
}

export interface IngestDocInput {
  slug: string;
  title: string;
  category: DocCategory;
  source_url?: string;
  markdown: string;
  subcategory?: string | null;
  /** If provided, only re-embed if hash differs from stored value */
  content_hash?: string;
}

export interface IngestResult {
  source_id: string;
  slug: string;
  chunks_created: number;
  skipped: boolean;
  reason?: string;
}

// ============================================================
// Action Registry Types
// ============================================================

export type WattleActionType = "navigate" | "create";

export type WattleActionCategory =
  | "pedagogy"
  | "students"
  | "attendance"
  | "operations"
  | "admin"
  | "comms"
  | "parent"
  | "general";

export interface WattleAction {
  /** Unique identifier the LLM references, e.g. "nav_attendance" */
  id: string;
  /** Human-readable label, e.g. "Go to Attendance" */
  label: string;
  /** Description for the LLM to understand when to suggest it */
  description: string;
  /** Determines how the frontend handles the action */
  type: WattleActionType;
  /** Target route for navigation */
  route: string;
  /** One or more permissions required (OR logic). Empty = always available */
  requiredPermissions: string[];
  /** Category for grouping in the system prompt */
  category: WattleActionCategory;
}

/** What the LLM returns when it wants to suggest an action */
export interface WattleActionSuggestion {
  /** Must match a WattleAction.id from the registry */
  action_id: string;
  /** Contextual display label the LLM generates */
  label: string;
}

// ============================================================
// Chat API Types (for the streaming endpoint)
// ============================================================

export interface AskWattleRequest {
  message: string;
  conversation_id?: string;
  /** User's current page context for smarter answers */
  current_route?: string;
  /** User's role for audience-aware responses */
  user_role?: "guide" | "parent" | "admin" | "staff";
  /** User's first name for personalised responses */
  user_name?: string;
  /** User's permission keys (sent as hint; server re-validates) */
  permissions?: string[];
  /** Tenant/school name for context */
  tenant_name?: string;
  /** Compressed manifest of visible UI elements for glow guidance */
  ui_manifest?: string;
}

export interface AskWattleStreamChunk {
  type:
    | "text"
    | "sources"
    | "conversation_id"
    | "actions"
    | "status"
    | "error"
    | "done"
    | "tool_result"
    | "confirm_action"
    | "highlight";
  content?: string;
  sources?: MessageSource[];
  conversation_id?: string;
  actions?: WattleActionSuggestion[];
  /** Status message shown during tool execution, e.g. "Checking attendance..." */
  status_message?: string;
  error?: string;
  /** Structured tool result for frontend visualization */
  tool_result?: ToolResultEvent;
  /** Confirmation request for destructive/bulk operations */
  confirmation?: ConfirmationRequest;
  /** Glow highlight directives for UI guidance */
  highlights?: GlowHighlight[];
  /** Workflow title for multi-step highlight guidance */
  workflow_title?: string;
  /** Total steps in the workflow (may differ from highlights array length) */
  highlight_total_steps?: number;
}

// ============================================================
// Structured Tool Results
// ============================================================
// Tool results are sent on two channels:
//   1. `content` (string) → goes to GPT for follow-up reasoning
//   2. `structured` → goes to the frontend for rich visual cards
//
// This separation means GPT never sees structured data and the
// frontend never parses GPT prose for data. Each channel is
// purpose-built for its consumer.

/** Sent to the client as a tool_result SSE event */
export interface ToolResultEvent {
  tool_call_id: string;
  tool_name: string;
  success: boolean;
  structured: ToolResultStructuredData;
  revert?: RevertDescriptor;
}

// ── Revert System ───────────────────────────────────────────

/** Descriptor for undoing a write operation */
export interface RevertDescriptor {
  /** Identifies the revert handler, e.g. "delete_attendance" */
  revert_action: string;
  /** Arguments the revert handler needs to undo the action */
  args: Record<string, unknown>;
  /** Button label shown to the user, e.g. "Undo" */
  label: string;
  /** ISO timestamp - reverts expire after 10 minutes */
  performed_at: string;
}

// ── Confirmation Flow ───────────────────────────────────────

/** Sent before executing destructive/bulk operations */
export interface ConfirmationRequest {
  /** Unique ID for this confirmation */
  confirmation_id: string;
  /** The tool that wants to execute */
  tool_name: string;
  /** The arguments the tool would execute with */
  args: Record<string, unknown>;
  /** Human-readable description, e.g. "Mark all 18 students in Banksia as present?" */
  description: string;
  /** Impact summary, e.g. "This will affect 18 attendance records" */
  impact_summary: string;
  /** Number of records affected */
  record_count: number;
}

// ── Disambiguation ──────────────────────────────────────────

export interface DisambiguationOption {
  student_id: string;
  display_name: string;
  class_name: string | null;
  enrollment_status: string;
}

// ── Structured Data Payloads ────────────────────────────────
// One interface per result type. Discriminated on `type`.

import type {
  AttendanceStatus,
  MedicalSeverity,
  RestrictionType,
  MasteryStatus,
  ObservationStatus,
  TimesheetStatus,
} from "@/types/domain";

export interface AttendanceConfirmationData {
  type: "attendance_confirmation";
  data: {
    student_name: string;
    student_id: string;
    status: AttendanceStatus;
    date: string;
    date_display: string;
    notes: string | null;
    record_id: string;
    /** null if this was a new record (no previous status to revert to) */
    previous_status: AttendanceStatus | null;
  };
}

export interface AttendanceSummaryData {
  type: "attendance_summary";
  data: {
    class_name: string;
    date: string;
    date_display: string;
    total_students: number;
    counts: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      half_day: number;
      unmarked: number;
    };
    roll_complete: boolean;
    unmarked_names: string[];
    absent_names: string[];
    late_names: string[];
  };
}

export interface StudentInfoData {
  type: "student_info";
  data: {
    student_id: string;
    display_name: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    enrollment_status: string;
    class_names: string[];
  };
}

export interface DisambiguationData {
  type: "disambiguation";
  data: {
    query: string;
    context: string;
    options: DisambiguationOption[];
  };
}

export interface ClassListData {
  type: "class_list";
  data: {
    classes: Array<{
      id: string;
      name: string;
      room: string | null;
      student_count: number;
    }>;
  };
}

export interface StudentListData {
  type: "student_list";
  data: {
    class_name: string;
    students: Array<{
      student_id: string;
      display_name: string;
      enrollment_status: string;
    }>;
  };
}

export interface AttendanceHistoryData {
  type: "attendance_history";
  data: {
    student_name: string;
    entries: Array<{
      date: string;
      date_display: string;
      status: AttendanceStatus;
      notes: string | null;
    }>;
    summary: {
      total_days: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      half_day: number;
    };
  };
}

export interface AbsentStudentsData {
  type: "absent_students";
  data: {
    date: string;
    date_display: string;
    classes: Array<{
      class_name: string;
      absent: string[];
      unmarked: string[];
      total_students: number;
    }>;
  };
}

export interface ObservationListData {
  type: "observation_list";
  data: {
    student_name: string;
    observations: Array<{
      id: string;
      content_preview: string;
      status: ObservationStatus;
      author_name: string;
      created_at: string;
      outcome_count: number;
    }>;
    total_count: number;
  };
}

export interface MasterySummaryData {
  type: "mastery_summary";
  data: {
    student_name: string;
    summary: Record<MasteryStatus, number>;
    total_outcomes: number;
    /** Top-level areas with progress */
    areas: Array<{
      area_name: string;
      mastered: number;
      practicing: number;
      presented: number;
      not_started: number;
      total: number;
    }>;
  };
}

export interface MedicalInfoData {
  type: "medical_info";
  sensitive: true;
  data: {
    student_name: string;
    conditions: Array<{
      id: string;
      condition_name: string;
      condition_type: string;
      severity: MedicalSeverity;
      description: string | null;
      action_plan: string | null;
      requires_medication: boolean;
      medication_name: string | null;
      medication_location: string | null;
      expiry_date: string | null;
    }>;
  };
}

export interface EmergencyContactsData {
  type: "emergency_contacts";
  sensitive: true;
  data: {
    student_name: string;
    contacts: Array<{
      id: string;
      name: string;
      relationship: string;
      phone_primary: string;
      phone_secondary: string | null;
      priority_order: number;
      notes: string | null;
    }>;
  };
}

export interface CustodyAlertData {
  type: "custody_alert";
  sensitive: true;
  data: {
    student_name: string;
    restrictions: Array<{
      id: string;
      restricted_person_name: string;
      restriction_type: RestrictionType;
      court_order_reference: string | null;
      effective_date: string;
      expiry_date: string | null;
      notes: string | null;
    }>;
  };
}

export interface AnnouncementListData {
  type: "announcement_list";
  data: {
    announcements: Array<{
      id: string;
      title: string;
      priority: string;
      author_name: string;
      published_at: string | null;
      acknowledged_count: number;
      total_recipients: number;
    }>;
  };
}

export interface EventListData {
  type: "event_list";
  data: {
    events: Array<{
      id: string;
      title: string;
      event_type: string;
      starts_at: string;
      ends_at: string | null;
      location: string | null;
      rsvp_count: number;
    }>;
  };
}

export interface ProgramSessionStatusData {
  type: "program_session_status";
  data: {
    program_name: string;
    session_date: string;
    session_time: string;
    capacity: number;
    booked: number;
    checked_in: number;
    checked_out: number;
    no_shows: number;
  };
}

export interface DailySummaryData {
  type: "daily_summary";
  data: {
    date: string;
    date_display: string;
    /** Only included if user has MANAGE_ATTENDANCE */
    attendance?: {
      classes_complete: number;
      classes_total: number;
      total_present: number;
      total_absent: number;
      total_unmarked: number;
    };
    /** Only included if user has MANAGE_EVENTS */
    events?: Array<{
      title: string;
      starts_at: string;
      event_type: string;
    }>;
    /** Only included if user has SEND_ANNOUNCEMENTS */
    recent_announcements?: number;
    /** Only included if user has APPROVE_TIMESHEETS */
    pending_timesheets?: number;
  };
}

export interface TimesheetStatusData {
  type: "timesheet_status";
  data: {
    period_name: string;
    period_start: string;
    period_end: string;
    status: TimesheetStatus | "no_timesheet";
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    leave_hours: number;
    entries_count: number;
  };
}

export interface BulkAttendanceConfirmationData {
  type: "bulk_attendance_confirmation";
  data: {
    class_name: string;
    date: string;
    date_display: string;
    status: AttendanceStatus;
    count: number;
    /** IDs of all affected records for revert */
    record_ids: string[];
  };
}

export interface CheckInConfirmationData {
  type: "checkin_confirmation";
  data: {
    student_name: string;
    student_id: string;
    program_name: string;
    session_date: string;
    checked_in_at: string;
    booking_id: string;
  };
}

export interface CheckOutConfirmationData {
  type: "checkout_confirmation";
  data: {
    student_name: string;
    student_id: string;
    program_name: string;
    session_date: string;
    checked_out_at: string;
    booking_id: string;
  };
}

export interface TimeEntryConfirmationData {
  type: "time_entry_confirmation";
  data: {
    date: string;
    date_display: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    total_hours: number;
    entry_type: string;
    notes: string | null;
    entry_id: string;
  };
}

// ── Glow UI Guidance ──────────────────────────────────────

/** A single element highlight directive from the LLM */
export interface GlowHighlight {
  /** Must match a registered GlowTarget id */
  target_id: string;
  /** Visual treatment: glow for attention, pulse for next action */
  style: "glow" | "pulse";
  /** Step number for sequential workflows (1, 2, 3...) */
  step?: number;
  /** Brief instruction shown near the element, e.g. "Tap here" */
  label?: string;
}

/** Structured data for highlight tool results */
export interface HighlightDirectiveData {
  type: "highlight_directive";
  data: {
    highlights: GlowHighlight[];
    workflow_title?: string;
    total_steps?: number;
  };
}

/** Structured data for staff compliance status tool results */
export interface StaffComplianceStatusData {
  type: "staff_compliance_status";
  data: {
    staff_members: Array<{
      user_id: string;
      display_name: string;
      email: string;
      position_title: string | null;
      wwcc_status: string;
      first_aid_status: string;
      cpr_status: string;
      anaphylaxis_status: string;
      asthma_status: string;
      food_safety_status: string;
      geccko_status: string;
      overall: "compliant" | "expiring" | "non_compliant";
    }>;
    summary: {
      total_staff: number;
      fully_compliant: number;
      expiring_soon: number;
      non_compliant: number;
    };
  };
}

/** Structured data for get_current_ratios tool results */
export interface RatioStatusData {
  type: "ratio_status";
  data: {
    rooms: Array<{
      class_id: string;
      class_name: string;
      children_present: number;
      educators_on_floor: number;
      required_educators: number;
      required_ratio_denominator: number;
      youngest_child_months: number | null;
      is_compliant: boolean;
      educator_names: string[];
    }>;
    summary: {
      total_rooms: number;
      compliant_rooms: number;
      breached_rooms: number;
    };
  };
}

/** Structured data for get_ratio_breach_history tool results */
export interface RatioBreachHistoryData {
  type: "ratio_breach_history";
  data: {
    breaches: Array<{
      id: string;
      class_name: string;
      logged_at: string;
      children_present: number;
      educators_on_floor: number;
      required_ratio_denominator: number;
      acknowledged: boolean;
      acknowledged_by_name: string | null;
    }>;
    total_breaches: number;
  };
}

/** Structured data for get_immunisation_compliance tool results */
export interface ImmunisationComplianceData {
  type: "immunisation_compliance";
  data:
    | {
        student: string;
        record: {
          id: string;
          student_id: string;
          ihs_date: string | null;
          status: string;
          support_period_start: string | null;
          support_period_end: string | null;
          next_air_check_due: string | null;
          exemption_noted_at: string | null;
          notes: string | null;
        } | null;
      }
    | {
        total_enrolled: number;
        with_record: number;
        no_record: number;
        counts: {
          up_to_date: number;
          catch_up_schedule: number;
          medical_exemption: number;
          pending: number;
        };
        compliance_percent: number;
        overdue_air_checks: string[];
        support_periods_ending_soon: string[];
      };
}

/** Structured data for get_ccs_reporting_summary tool results */
export interface CcsReportingSummaryData {
  type: "ccs_reporting_summary";
  data:
    | {
        // Single student absence cap
        student: string;
        financial_year: string;
        capped_days_used: number;
        uncapped_days: number;
        cap_limit: number;
        is_at_cap: boolean;
      }
    | {
        // Full summary
        current_week_status: string | null;
        current_week_reports: number;
        unbundled_reports: number;
        children_near_cap: number;
        recent_bundles: Array<{
          week: string;
          status: string;
          reports: number;
        }>;
      };
}

/** Structured data for get_emergency_drill_compliance tool results */
export interface EmergencyDrillComplianceData {
  type: "emergency_drill_compliance";
  data: {
    overall_status: "compliant" | "at_risk" | "overdue";
    total_this_year: number;
    follow_ups_pending: number;
    compliance_by_type: Array<{
      drill_type: string;
      label: string;
      last_drill_date: string | null;
      days_since_last: number | null;
      drills_this_year: number;
      average_evacuation_seconds: number | null;
      is_overdue: boolean;
      is_at_risk: boolean;
    }>;
    upcoming_scheduled: Array<{
      drill_type: string;
      scheduled_date: string;
      scheduled_time: string | null;
    }>;
  };
}

/** Structured data for get_emergency_coordination_status tool results */
export interface EmergencyCoordinationStatusData {
  type: "emergency_coordination_status";
  data: {
    has_active_event: boolean;
    active_event_type: string | null;
    active_event_severity: string | null;
    recent_event_count: number;
    zones_configured: number;
  };
}

/** Structured data for get_pending_excursion_consents tool results */
export interface ExcursionConsentStatusData {
  type: "excursion_consent_status";
  data: {
    excursion_name: string;
    excursion_date: string;
    destination: string;
    status: string;
    consents: {
      total: number;
      consented: number;
      declined: number;
      pending: number;
    };
    pending_students: string[];
    declined_students: string[];
  };
}

/** Structured data for get_lesson_history tool results */
export interface LessonHistoryData {
  type: "lesson_history";
  data: {
    student_name: string;
    area_filter: string | null;
    records: Array<{
      material_name: string;
      area: string;
      presentation_date: string;
      stage: string;
      child_response: string | null;
      educator_name: string | null;
    }>;
    summary: {
      total_lessons: number;
      by_area: Record<string, number>;
      by_stage: Record<string, number>;
    };
  };
}

/** Structured data for suggest_next_lesson tool results */
export interface NextLessonSuggestionData {
  type: "next_lesson_suggestion";
  data: {
    student_name: string;
    area: string;
    suggestions: Array<{
      material_name: string;
      material_id: string;
      reason: string;
      prerequisite_met: boolean;
      age_level: string;
      eylf_outcomes: string[];
    }>;
  };
}

/** Structured data for get_mqap_readiness tool results */
export interface MqapReadinessData {
  type: "mqap_readiness";
  data: {
    total_criteria: number;
    assessed: number;
    unassessed: number;
    by_rating: Record<string, number>;
    active_goals: number;
    overdue_goals: number;
    readiness_percent: number;
    gaps: string[];
  };
}

/** Structured data for get_daily_care_summary tool results */
export interface DailyCareSummaryData {
  type: "daily_care_summary";
  data: {
    date: string;
    date_display: string;
    total_children: number;
    summary: {
      nappy_changes: number;
      meals: number;
      bottles: number;
      sleeps: number;
      sunscreen: number;
      wellbeing_notes: number;
    };
    children: Array<{
      student_name: string;
      entry_count: number;
      status: string;
    }>;
  };
}

/** Structured data for get_child_care_log_today tool results */
export interface DailyCareLogDetailData {
  type: "daily_care_log_detail";
  data: {
    student_name: string;
    date: string;
    date_display: string;
    status: string;
    entries: Array<{
      time: string;
      type: string;
      details: string;
      notes: string | null;
    }>;
  };
}

/** Structured data for get_photo_coverage tool results */
export interface PhotoCoverageData {
  type: "photo_coverage";
  data: {
    student_total: number;
    student_with_photo: number;
    student_percentage: number;
    staff_total: number;
    staff_with_photo: number;
    staff_percentage: number;
    last_session: {
      name: string;
      session_date: string;
      status: string;
    } | null;
  };
}

export interface UnexplainedAbsencesSummaryData {
  type: "unexplained_absences_summary";
  data: {
    date: string;
    summary: {
      pending: number;
      notified: number;
      escalated: number;
      explained: number;
      dismissed: number;
      total: number;
    };
    pending_students: Array<{
      student_id: string;
      student_name: string;
      status: string;
    }>;
    module_enabled: boolean;
  };
}

/** Union of all structured data payloads */
export type ToolResultStructuredData =
  | AttendanceConfirmationData
  | AttendanceSummaryData
  | StudentInfoData
  | DisambiguationData
  | ClassListData
  | StudentListData
  | AttendanceHistoryData
  | AbsentStudentsData
  | ObservationListData
  | MasterySummaryData
  | MedicalInfoData
  | EmergencyContactsData
  | CustodyAlertData
  | AnnouncementListData
  | EventListData
  | ProgramSessionStatusData
  | DailySummaryData
  | TimesheetStatusData
  | BulkAttendanceConfirmationData
  | CheckInConfirmationData
  | CheckOutConfirmationData
  | TimeEntryConfirmationData
  | HighlightDirectiveData
  | StaffComplianceStatusData
  | RatioStatusData
  | RatioBreachHistoryData
  | ImmunisationComplianceData
  | CcsReportingSummaryData
  | EmergencyDrillComplianceData
  | EmergencyCoordinationStatusData
  | ExcursionConsentStatusData
  | LessonHistoryData
  | NextLessonSuggestionData
  | MqapReadinessData
  | DailyCareSummaryData
  | DailyCareLogDetailData
  | PhotoCoverageData
  | UnexplainedAbsencesSummaryData
  | FeeNoticeSummaryData
  | RecurringBillingStatusData;

export interface FeeNoticeSummaryData {
  type: "fee_notice_summary";
  data: {
    pending_count: number;
    sent_30d: number;
    failed_count: number;
    overdue_without_notice: number;
    configured: boolean;
  };
}

export interface RecurringBillingStatusData {
  type: "recurring_billing_status";
  data: {
    total: number;
    active: number;
    paused: number;
    failed: number;
    becs: number;
    card: number;
    ccs: number;
    pending_mandate: number;
    pending_retries: number;
    unresolved_failures: number;
  };
}
