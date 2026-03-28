// src/lib/docs/wattle-tools.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Database Tools
// ============================================================
// Executable tools that give Wattle real database access.
//
// Architecture:
//   - TOOL_REGISTRY: OpenAI function schemas + metadata
//   - resolveClassName / resolveStudentName: fuzzy name→ID helpers
//   - executeWattleTool(): dispatcher that calls Supabase queries
//   - buildToolsForOpenAI(): filters tools by user permissions
//
// WHY own queries instead of calling server actions: Server
// actions use requirePermission() → getTenantContext() which
// relies on React cache() + redirect() - these don't work
// in API route context. We query Supabase directly here.
// RLS handles tenant isolation automatically via the user's JWT.
//
// WHY string results: OpenAI tool results are always strings.
// Formatting data as human-readable text lets GPT-4o naturally
// weave it into conversational responses without JSON wrangling.
// The `structured` field is a parallel channel for frontend
// rendering - GPT never sees it.
// ============================================================

import { Permissions } from "@/lib/constants/permissions";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { AttendanceStatus } from "@/types/domain";
import type {
  GlowHighlight,
  RevertDescriptor,
  ToolResultStructuredData,
} from "@/types/ask-wattle";
import { checkWriteRateLimit } from "./wattle-rate-limit";
import {
  handleGetClassRoster,
  handleGetStudentAttendanceHistory,
  handleGetAbsentStudentsToday,
  handleGetStudentObservations,
  handleGetStudentMasterySummary,
  handleGetStudentMedicalInfo,
  handleGetChildMedicalAlerts,
  handleGetEmergencyContacts,
  handleGetCustodyRestrictions,
  handleGetRecentAnnouncements,
  handleGetUpcomingEvents,
  handleGetProgramSessionStatus,
  handleGetDailySummary,
  handleGetMyTimesheetStatus,
  handleBulkMarkAttendance,
  handleCheckInStudent,
  handleCheckOutStudent,
  handleLogTimeEntry,
  handleGetStaffComplianceStatus,
  handleGetCurrentRatios,
  handleGetRatioBreachHistory,
  handleGetImmunisationCompliance,
  handleGetCcsReportingSummary,
  handleGetEmergencyDrillCompliance,
  handleGetEmergencyCoordinationStatus,
  handleGetPendingExcursionConsents,
  handleGetLessonHistory,
  handleSuggestNextLesson,
  handleGetMqapReadiness,
  handleDraftObservation,
  handleGetQipSuggestions,
  handleDraftIncidentReport,
  handleDraftPolicy,
  handleDraftRiskAssessment,
  handleDraftParentComms,
  handleDraftMedicationPlan,
  handleDraftStaffComplianceAction,
  handleGetDailyCareSummary,
  handleGetChildCareLogToday,
  handleGetPhotoCoverage,
  handleGetVolunteerRoster,
  handleGetUnexplainedAbsences,
  handleGetFeeNoticeSummary,
  handleGetRecurringBillingStatus,
} from "./wattle-tool-handlers";

// ============================================================
// Supabase Client Type
// ============================================================
// We accept the pre-created client from the API route rather
// than calling createSupabaseServerClient() inside tool handlers.
//
// WHY: createSupabaseServerClient() calls cookies() from
// next/headers which uses AsyncLocalStorage. Inside a
// ReadableStream.start() callback the async context is lost,
// so cookies() fails silently → unauthenticated client → RLS
// blocks all queries → "no students found". By creating the
// client BEFORE the stream starts and passing it in, the JWT
// is captured while the request context is still alive.
type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// ============================================================
// Types
// ============================================================

type ToolCategory = "executable" | "suggestion";

interface WattleToolDef {
  name: string;
  category: ToolCategory;
  /** OpenAI function description */
  description: string;
  /** OpenAI function parameters schema */
  parameters: Record<string, unknown>;
  /** Permission keys required (OR logic) */
  requiredPermissions: string[];
  /** Shown in UI during execution */
  statusMessage: string;
  /** Whether this tool modifies data (vs read-only) */
  isWrite: boolean;
  /** Whether this tool's results contain sensitive data (medical, custody) */
  sensitive: boolean;
  /** Whether bulk operations require user confirmation before executing */
  requiresConfirmation: boolean;
}

export interface WattleToolContext {
  /** Pre-created Supabase client with the user's JWT baked in.
   *  MUST be created before the ReadableStream starts. */
  supabase: SupabaseClient;
  userId: string;
  tenantId: string | null;
  permissions: string[];
}

export interface WattleToolResult {
  tool_call_id: string;
  tool_name: string;
  success: boolean;
  /** Text content sent to GPT for follow-up reasoning */
  content: string;
  /** Structured data sent to the frontend for visual rendering */
  structured?: ToolResultStructuredData;
  /** Revert descriptor for undo button on write operations */
  revert?: RevertDescriptor;
}

// ============================================================
// Tool Registry
// ============================================================

const TOOL_REGISTRY: WattleToolDef[] = [
  // ── Executable: Read Tools ─────────────────────────────────
  {
    name: "list_classes",
    category: "executable",
    description:
      "List all classes/groups at the school with their student counts. Use this when the user asks about classes, groups, or environments.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [], // Any authenticated user
    statusMessage: "Looking up classes...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "lookup_student",
    category: "executable",
    description:
      "Look up a student by name. Returns their enrollment status, class, and basic info. Use when the user mentions a specific student.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "The student's first name, last name, or full name to search for",
        },
      },
      required: ["name"],
    },
    requiredPermissions: [
      Permissions.VIEW_STUDENTS,
      Permissions.MANAGE_STUDENTS,
    ],
    statusMessage: "Looking up student...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "check_attendance",
    category: "executable",
    description:
      "Check attendance status for a class on a specific date. Returns who is present, absent, late, and who hasn't been marked yet. Defaults to today if no date specified.",
    parameters: {
      type: "object",
      properties: {
        class_name: {
          type: "string",
          description: "Name of the class (e.g. 'Banksia', 'Wattle')",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Omit for today.",
        },
      },
      required: ["class_name"],
    },
    requiredPermissions: [Permissions.MANAGE_ATTENDANCE],
    statusMessage: "Checking attendance...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Executable: Write Tools ────────────────────────────────
  {
    name: "mark_attendance",
    category: "executable",
    description:
      "Mark a student's attendance (present, absent, late, excused, or half_day). Defaults to today. Use when the user asks to mark someone's roll call status.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The student's name (first, last, or full)",
        },
        status: {
          type: "string",
          enum: ["present", "absent", "late", "excused", "half_day"],
          description: "The attendance status to set",
        },
        class_name: {
          type: "string",
          description:
            "Class name to disambiguate if the student is in multiple classes. Optional.",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Omit for today.",
        },
        notes: {
          type: "string",
          description: "Optional notes (e.g. reason for absence)",
        },
      },
      required: ["student_name", "status"],
    },
    requiredPermissions: [Permissions.MANAGE_ATTENDANCE],
    statusMessage: "Marking attendance...",
    isWrite: true,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "bulk_mark_attendance",
    category: "executable",
    description:
      "Mark ALL students in a class with the same attendance status. Requires confirmation before executing. Use when the user says things like 'mark everyone in Banksia as present' or 'whole class is here'. The first call (without confirmed=true) returns a count for confirmation. The second call (with confirmed=true) executes the bulk operation.",
    parameters: {
      type: "object",
      properties: {
        class_name: {
          type: "string",
          description: "Name of the class",
        },
        status: {
          type: "string",
          enum: ["present", "absent", "late", "excused", "half_day"],
          description: "The attendance status to set for all students",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Omit for today.",
        },
        confirmed: {
          type: "boolean",
          description:
            "Set to true on the second call to execute the bulk operation after user confirms.",
        },
      },
      required: ["class_name", "status"],
    },
    requiredPermissions: [Permissions.MANAGE_ATTENDANCE],
    statusMessage: "Marking class attendance...",
    isWrite: true,
    sensitive: false,
    requiresConfirmation: true,
  },
  {
    name: "check_in_student",
    category: "executable",
    description:
      "Check in a student to an OSHC/before-school/after-school care program session. Use when the user says things like 'check in Felix to After School Care'.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The student's name",
        },
        program_name: {
          type: "string",
          description:
            "The program name (e.g. 'Before School Care', 'After School Care')",
        },
      },
      required: ["student_name", "program_name"],
    },
    requiredPermissions: [Permissions.CHECKIN_CHECKOUT],
    statusMessage: "Checking in student...",
    isWrite: true,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "check_out_student",
    category: "executable",
    description:
      "Check out a student from an OSHC/before-school/after-school care program session. Use when the user says things like 'check out Felix from After School Care'.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The student's name",
        },
        program_name: {
          type: "string",
          description:
            "The program name (e.g. 'Before School Care', 'After School Care')",
        },
      },
      required: ["student_name", "program_name"],
    },
    requiredPermissions: [Permissions.CHECKIN_CHECKOUT],
    statusMessage: "Checking out student...",
    isWrite: true,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "log_time_entry",
    category: "executable",
    description:
      "Log a time entry for the current user's timesheet. Use when the user says things like 'log my hours today, 8am to 4pm' or 'add a time entry for yesterday'.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Omit for today.",
        },
        start_time: {
          type: "string",
          description: "Start time in HH:MM format (e.g. '08:00')",
        },
        end_time: {
          type: "string",
          description: "End time in HH:MM format (e.g. '16:00')",
        },
        break_minutes: {
          type: "number",
          description: "Break duration in minutes (default 0)",
        },
        entry_type: {
          type: "string",
          enum: ["regular", "overtime", "leave"],
          description: "Type of time entry (default 'regular')",
        },
        notes: {
          type: "string",
          description: "Optional notes for this time entry",
        },
      },
      required: ["start_time", "end_time"],
    },
    requiredPermissions: [Permissions.LOG_TIME],
    statusMessage: "Logging time entry...",
    isWrite: true,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── New Read Tools ─────────────────────────────────────────
  {
    name: "get_class_roster",
    category: "executable",
    description: "Get the list of students enrolled in a specific class.",
    parameters: {
      type: "object",
      properties: {
        class_name: { type: "string", description: "Name of the class" },
      },
      required: ["class_name"],
    },
    requiredPermissions: [
      Permissions.VIEW_STUDENTS,
      Permissions.MANAGE_STUDENTS,
    ],
    statusMessage: "Looking up class roster...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_student_attendance_history",
    category: "executable",
    description:
      "Get a student's attendance history over the last N days (default 14, max 90).",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
        days: {
          type: "number",
          description: "Number of days to look back (default 14, max 90)",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [
      Permissions.MANAGE_ATTENDANCE,
      Permissions.VIEW_ATTENDANCE_REPORTS,
    ],
    statusMessage: "Checking attendance history...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_absent_students_today",
    category: "executable",
    description:
      "Get all absent or unmarked students across all classes for today. Use when the user asks who is absent or who hasn't been marked.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.MANAGE_ATTENDANCE],
    statusMessage: "Checking absences...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_student_observations",
    category: "executable",
    description:
      "Get recent observations for a student. Returns content preview, author, and outcome count.",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
        limit: {
          type: "number",
          description: "Max observations to return (default 5, max 20)",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_ALL_OBSERVATIONS],
    statusMessage: "Looking up observations...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_student_mastery_summary",
    category: "executable",
    description:
      "Get a student's mastery progress summary showing how many outcomes are mastered, practicing, presented, or not started.",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.MANAGE_MASTERY],
    statusMessage: "Checking mastery progress...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_student_medical_info",
    category: "executable",
    description:
      "Get a student's medical conditions, allergies, action plans, and medication details. This is SENSITIVE data - use only when explicitly asked. Access is logged for compliance.",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_MEDICAL_RECORDS],
    statusMessage: "Looking up medical information...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_child_medical_alerts",
    category: "executable",
    description:
      "Get a child's active medical management plans (ASCIA, asthma, diabetes, etc.), current medication authorisations, and recent administrations. Surfaces expiring plans and due medications. This is SENSITIVE Reg 93/94 compliance data - use when asked about a child's medication needs, management plans, or medical alerts. Access is logged.",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_MEDICATION_RECORDS],
    statusMessage: "Checking medical management plans...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_emergency_contacts",
    category: "executable",
    description:
      "Get a student's emergency contacts with phone numbers and relationships. Access is logged for compliance.",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_STUDENTS],
    statusMessage: "Looking up emergency contacts...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_custody_restrictions",
    category: "executable",
    description:
      "Get a student's custody restrictions and pickup restrictions. This is CRITICAL SAFETY data - always present clearly and prominently. Access is logged.",
    parameters: {
      type: "object",
      properties: {
        student_name: { type: "string", description: "The student's name" },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.MANAGE_SAFETY_RECORDS],
    statusMessage: "Checking custody restrictions...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_recent_announcements",
    category: "executable",
    description: "Get the most recent published announcements.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.SEND_ANNOUNCEMENTS],
    statusMessage: "Looking up announcements...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_upcoming_events",
    category: "executable",
    description: "Get upcoming school events starting from today.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.MANAGE_EVENTS],
    statusMessage: "Looking up events...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_program_session_status",
    category: "executable",
    description:
      "Get today's session status for an OSHC/program - bookings, check-ins, check-outs, and capacity.",
    parameters: {
      type: "object",
      properties: {
        program_name: {
          type: "string",
          description:
            "The program name (e.g. 'Before School Care', 'After School Care')",
        },
      },
      required: ["program_name"],
    },
    requiredPermissions: [Permissions.MANAGE_PROGRAMS],
    statusMessage: "Checking program status...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_daily_summary",
    category: "executable",
    description:
      "Get an overview of today - attendance completion, events, recent announcements, pending timesheets. Content varies based on the user's permissions.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [], // Internally permission-gated
    statusMessage: "Building your daily summary...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_my_timesheet_status",
    category: "executable",
    description:
      "Get the current user's timesheet status for the active pay period - hours logged, submission status, and entry count.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.LOG_TIME],
    statusMessage: "Checking your timesheet...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module C: Staff Compliance (Reg 136/145/146) ────────────
  {
    name: "get_staff_compliance_status",
    category: "executable",
    description:
      "Get staff compliance status including WWCC, First Aid, CPR, Anaphylaxis, Asthma, Food Safety Supervisor, and Geccko child safety training. Returns who is expiring, what is missing, and current compliance status across all staff or for a specific staff member. Use when asked about staff qualifications, compliance, WWCC expiry, training status, food safety certificates, or regulatory readiness.",
    parameters: {
      type: "object",
      properties: {
        staff_member_name: {
          type: "string",
          description:
            "Optional: the staff member's name (first, last, or full). Omit to get entire staff compliance summary.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_STAFF_COMPLIANCE,
      Permissions.MANAGE_STAFF_COMPLIANCE,
    ],
    statusMessage: "Checking staff compliance status...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module D: Ratio Monitoring (Reg 123) ──────────────────
  {
    name: "get_current_ratios",
    category: "executable",
    description:
      "Get the current educator-to-child ratio status for all rooms/classes. Shows how many children are present, how many educators are on the floor, whether the ratio is compliant, and who the educators are. Use when the user asks about ratios, staffing levels, or floor coverage.",
    parameters: {
      type: "object",
      properties: {
        class_name: {
          type: "string",
          description:
            "Optional: specific class name to check. Omit to see all rooms.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_RATIOS,
      Permissions.MANAGE_FLOOR_SIGNIN,
    ],
    statusMessage: "Checking current ratios...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_ratio_breach_history",
    category: "executable",
    description:
      "Get the history of ratio breaches across all rooms. Shows when ratios were out of compliance, how many children vs educators, and whether each breach was acknowledged. Use when the user asks about past ratio issues or compliance history.",
    parameters: {
      type: "object",
      properties: {
        class_name: {
          type: "string",
          description: "Optional: filter breaches to a specific class name.",
        },
        days: {
          type: "number",
          description:
            "Number of days to look back (default 7, max 90). Omit for 7 days.",
        },
      },
    },
    requiredPermissions: [Permissions.VIEW_RATIOS],
    statusMessage: "Checking breach history...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module F: Immunisation Compliance ──────────────────────
  {
    name: "get_immunisation_compliance",
    category: "executable",
    description:
      "Get immunisation compliance status for enrolled children. Shows who has a valid IHS (Immunisation History Statement), who is on a catch-up schedule, who has a medical exemption, and who is pending. Highlights overdue AIR checks and children whose 16-week support period is ending soon. Use when asked about immunisation, IHS, vaccinations, No Jab No Pay/Play, or AIR checks.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description:
            "Optional: specific child's name (first, last, or full). Omit for full compliance summary.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_IMMUNISATION,
      Permissions.MANAGE_IMMUNISATION,
    ],
    statusMessage: "Checking immunisation compliance...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  // ── Module G: CCS Session Reporting ──────────────────────────
  {
    name: "get_ccs_reporting_summary",
    category: "executable",
    description:
      "Get CCS (Child Care Subsidy) session reporting status. Shows current week bundle, recent bundle statuses, children approaching the 42-day annual absence cap, and unbundled report counts. Use when asked about CCS reports, session bundles, absence caps, CCMS submissions, or Child Care Subsidy compliance.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description:
            "Optional: specific child's name to check their absence cap usage. Omit for full CCS summary.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_CCS_REPORTS,
      Permissions.MANAGE_CCS_REPORTS,
    ],
    statusMessage: "Checking CCS session reports...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module L: Emergency Drill Tracking ──────────────────────
  {
    name: "get_emergency_drill_compliance",
    category: "executable",
    description:
      "Get emergency drill compliance status. Shows when each drill type (fire evacuation, lockdown, shelter in place, medical emergency) was last conducted, whether the service is overdue (>31 days) or at risk (25–31 days), how many drills have been completed this year, average evacuation times, and any follow-ups still pending. Use when asked about emergency drills, evacuation drills, fire drills, lockdown drills, Regulation 97, or emergency procedure compliance.",
    parameters: {
      type: "object",
      properties: {
        drill_type: {
          type: "string",
          description:
            "Optional: filter to a specific drill type - fire_evacuation, lockdown, shelter_in_place, or medical_emergency. Omit for full compliance summary.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_EMERGENCY_DRILLS,
      Permissions.MANAGE_EMERGENCY_DRILLS,
    ],
    statusMessage: "Checking emergency drill compliance...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module M: Emergency Coordination (Live) ─────────────────
  {
    name: "get_emergency_coordination_status",
    category: "executable",
    description:
      "Get the current live emergency coordination status. Shows whether there is an active emergency event, the event type and severity, how many students and staff have been accounted for, zone statuses, and timeline of actions taken. Also shows recent past events. Use when asked about active emergencies, emergency coordination, live emergency status, or real-time emergency events.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [
      Permissions.VIEW_EMERGENCY_COORDINATION,
      Permissions.COORDINATE_EMERGENCY,
      Permissions.ACTIVATE_EMERGENCY,
    ],
    statusMessage: "Checking emergency coordination status...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module H: Excursion Consent Tracking ───────────────────
  {
    name: "get_pending_excursion_consents",
    category: "executable",
    description:
      "Get pending excursion consent status. Shows which children are still missing consent for upcoming excursions, consent counts (consented/pending/declined), and excursion details. Use when asked about excursion consents, field trip permissions, or 'who hasn't signed the form yet?'",
    parameters: {
      type: "object",
      properties: {
        excursion_name: {
          type: "string",
          description:
            "Optional: filter to a specific excursion by name. Omit to see all upcoming excursions with pending consents.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_EXCURSIONS,
      Permissions.MANAGE_EXCURSIONS,
    ],
    statusMessage: "Checking excursion consents...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module J: Lesson History ──────────────────────────────
  {
    name: "get_lesson_history",
    category: "executable",
    description:
      "Get a child's Montessori lesson history. Shows which materials have been presented, at what stage (introduction/practice/mastery), child's response, and dates. Filterable by curriculum area (practical_life, sensorial, language, mathematics, cultural). Use when asked about a child's lesson records, what they've been working on, or curriculum progress.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The child's name (first, last, or full).",
        },
        area: {
          type: "string",
          description:
            "Optional: Montessori curriculum area - practical_life, sensorial, language, mathematics, or cultural.",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [
      Permissions.VIEW_LESSON_RECORDS,
      Permissions.MANAGE_LESSON_RECORDS,
    ],
    statusMessage: "Looking up lesson records...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module J: Next Lesson Suggestion ──────────────────────
  {
    name: "suggest_next_lesson",
    category: "executable",
    description:
      "Suggest the next Montessori material/lesson for a child based on their current mastery stage and the material sequence. Returns the child's most recent lessons and the next material(s) in the curriculum sequence. Use when asked 'what should [child] work on next?' or 'what's the next lesson for [child]?'",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The child's name (first, last, or full).",
        },
        area: {
          type: "string",
          description:
            "Optional: Montessori curriculum area to focus on - practical_life, sensorial, language, mathematics, or cultural.",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [
      Permissions.VIEW_LESSON_RECORDS,
      Permissions.MANAGE_LESSON_RECORDS,
    ],
    statusMessage: "Analysing lesson progression...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Absence Follow-up ─────────────────────────────────────
  {
    name: "get_unexplained_absences",
    category: "executable",
    description:
      "Get today's unexplained absence alert summary. Shows how many students have unexcused absences by status (pending, notified, escalated, explained, dismissed) and lists the names of students with pending alerts. Use when asked about unexplained absences, absence follow-up, unexcused absences, 'who hasn't explained their absence?', or absence alerts.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "Optional: ISO date (YYYY-MM-DD) to check. Defaults to today.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_ABSENCE_FOLLOWUP,
      Permissions.MANAGE_ABSENCE_FOLLOWUP,
    ],
    statusMessage: "Checking unexplained absences...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module K: MQ:AP Readiness ─────────────────────────────
  {
    name: "get_mqap_readiness",
    category: "executable",
    description:
      "Get MQ:AP (Montessori Quality: Authentic Practice) readiness status. Shows self-assessment completion across all 7 Quality Areas, gap analysis (unassessed criteria, 'working towards' without goals), improvement goal progress, and NQS alignment status. Use when asked about MQ:AP readiness, Montessori accreditation readiness, or 'are we ready for a MQ:AP review?'",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_MQAP, Permissions.MANAGE_MQAP],
    statusMessage: "Checking MQ:AP readiness...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module L: AI Draft / Query Tools ──────────────────────
  {
    name: "draft_observation",
    category: "executable",
    description:
      "Draft a polished EYLF-mapped observation from rough educator notes. Gathers context about the child (recent observations, mastery areas, class info) and returns structured context so you can write a professional narrative observation. Use when an educator says 'write an observation for…', 'I noticed…', or provides rough notes about a child's learning moment.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "Name of the child the observation is about",
        },
        rough_notes: {
          type: "string",
          description:
            "Educator's rough notes, voice transcript, or description of the learning moment",
        },
      },
      required: ["student_name", "rough_notes"],
    },
    requiredPermissions: [Permissions.CREATE_OBSERVATION],
    statusMessage: "Gathering context for observation draft...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_qip_suggestions",
    category: "executable",
    description:
      "Surface data-driven QIP improvement suggestions by analysing patterns across attendance, incidents, observations, and lesson records. Returns actionable insights like 'High absence rate in Banksia - consider QA6 goal' or 'Low observation frequency for sensorial area'. Use when asked 'what should we improve?', 'QIP ideas', or 'what does the data tell us?'",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_QIP, Permissions.MANAGE_QIP],
    statusMessage: "Analysing data for QIP suggestions...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "draft_incident_report",
    category: "executable",
    description:
      "Gather context to draft an incident/injury/illness report in regulatory language (Reg 85-87). Fetches the child's medical info and recent incidents to inform the draft. Use when an educator says 'write an incident report', 'a child was injured', or describes an incident that needs documenting.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "Name of the child involved",
        },
        description: {
          type: "string",
          description:
            "What happened - rough description of the incident, injury, or illness",
        },
        incident_type: {
          type: "string",
          enum: [
            "injury",
            "illness",
            "incident",
            "near_miss",
            "medication_error",
          ],
          description: "Type of incident",
        },
      },
      required: ["student_name", "description"],
    },
    requiredPermissions: [
      Permissions.CREATE_INCIDENT,
      Permissions.MANAGE_INCIDENTS,
    ],
    statusMessage: "Gathering context for incident report...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "draft_policy",
    category: "executable",
    description:
      "Gather context to draft a compliant policy document with NQF regulation citations. Fetches existing policies in the same category and Reg 168 requirements. Use when asked to 'write a policy', 'draft a new policy on…', or 'update our sun safety policy'.",
    parameters: {
      type: "object",
      properties: {
        policy_topic: {
          type: "string",
          description:
            "Topic or title for the policy (e.g. 'Sun Safety', 'Behaviour Guidance', 'Sleep and Rest')",
        },
        intent: {
          type: "string",
          description: "Educator's description of what the policy should cover",
        },
      },
      required: ["policy_topic"],
    },
    requiredPermissions: [Permissions.MANAGE_POLICIES],
    statusMessage: "Gathering context for policy draft...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "draft_risk_assessment",
    category: "executable",
    description:
      "Gather context to draft an excursion risk assessment (Reg 100-102). Fetches the excursion details and past risk assessments for similar destinations to inform the draft. Use when asked to 'write a risk assessment', 'assess the risks for the excursion to…', or when planning an excursion.",
    parameters: {
      type: "object",
      properties: {
        excursion_name: {
          type: "string",
          description: "Name or destination of the excursion",
        },
      },
      required: ["excursion_name"],
    },
    requiredPermissions: [
      Permissions.MANAGE_EXCURSIONS,
      Permissions.VIEW_EXCURSIONS,
    ],
    statusMessage: "Gathering context for risk assessment...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "draft_parent_comms",
    category: "executable",
    description:
      "Gather context to draft a parent communication (injury notification, incident summary, policy change letter, or general notice). Fetches relevant records so you can compose a professional, empathetic message. Use when asked to 'write a letter to parents', 'notify parents about…', or 'draft an injury notification'.",
    parameters: {
      type: "object",
      properties: {
        comms_type: {
          type: "string",
          enum: [
            "injury_notification",
            "incident_summary",
            "policy_change",
            "general_notice",
          ],
          description: "Type of parent communication",
        },
        context: {
          type: "string",
          description: "Description of what the communication is about",
        },
        student_name: {
          type: "string",
          description:
            "Name of the specific child (for injury/incident notifications). Optional for policy_change/general_notice.",
        },
      },
      required: ["comms_type", "context"],
    },
    requiredPermissions: [Permissions.SEND_ANNOUNCEMENTS],
    statusMessage: "Gathering context for parent communication...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "draft_medication_plan",
    category: "executable",
    description:
      "Gather context to draft a medical management plan (ASCIA anaphylaxis action plan, asthma action plan, diabetes management plan, or other) for a child with a known medical condition. Fetches the child's existing medical conditions, current plans, and active authorisations so you can compose a clinician-ready draft. Use when asked to 'draft an anaphylaxis plan for [child]', 'update [child]'s asthma plan', or 'create a medical management plan'.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "Name of the child the plan is for",
        },
        condition_type: {
          type: "string",
          enum: ["anaphylaxis", "asthma", "diabetes", "other"],
          description: "Type of medical condition the plan addresses",
        },
        rough_notes: {
          type: "string",
          description:
            "Any additional context from the educator or administrator (triggers, current medications, recent reactions, etc.)",
        },
      },
      required: ["student_name", "condition_type", "rough_notes"],
    },
    requiredPermissions: [
      Permissions.VIEW_MEDICATION_RECORDS,
      Permissions.MANAGE_MEDICATION_PLANS,
    ],
    statusMessage: "Gathering medical context for plan draft...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "draft_staff_compliance_action",
    category: "executable",
    description:
      "Analyse a staff member's compliance record and draft a recommended action plan covering WWCC renewal, certificate bookings (first aid, CPR, anaphylaxis, asthma, food safety supervisor), and Geccko training completion. Use when asked to 'check [staff]'s compliance', 'what does [staff] need to renew?', or 'draft a compliance action plan for [staff]'.",
    parameters: {
      type: "object",
      properties: {
        staff_name_or_email: {
          type: "string",
          description:
            "Full name or email address of the staff member to check",
        },
        urgency_context: {
          type: "string",
          description:
            "Optional - additional context about urgency (e.g. 'annual review due', 'WWCC expires next month')",
        },
      },
      required: ["staff_name_or_email"],
    },
    requiredPermissions: [Permissions.VIEW_STAFF_COMPLIANCE],
    statusMessage: "Checking staff compliance record...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  // ── Glow UI Guidance ────────────────────────────────────────
  {
    name: "highlight_ui_elements",
    category: "executable",
    description:
      "Highlight specific UI elements on the user's screen to visually guide them through a workflow. Use this when the user asks 'how do I...?' or needs step-by-step guidance AND a UI manifest is available showing elements on their current page. Each highlight targets an element by its ID from the manifest. Use step numbers (1, 2, 3) for sequential workflows. Only highlight elements listed in the UI manifest.",
    parameters: {
      type: "object",
      properties: {
        highlights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              target_id: {
                type: "string",
                description: "The element ID from the UI manifest",
              },
              style: {
                type: "string",
                enum: ["glow", "pulse"],
                description:
                  "Visual style: glow for drawing attention, pulse for the next action to take",
              },
              step: {
                type: "number",
                description:
                  "Step number for sequential guidance (1, 2, 3...). Omit if all highlights should show simultaneously.",
              },
              label: {
                type: "string",
                description:
                  "Brief instruction shown near the element (2-5 words), e.g. 'Tap here', 'Pick a class', 'Select status'",
              },
            },
            required: ["target_id", "style"],
          },
          description: "Elements to highlight on the user's screen",
        },
        workflow_title: {
          type: "string",
          description:
            "Title for the workflow being guided, e.g. 'Taking Roll Call'",
        },
      },
      required: ["highlights"],
    },
    requiredPermissions: [], // Any authenticated user
    statusMessage: "Showing you where to go...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Module N: Staff Rostering & Relief ─────────────────────
  {
    name: "get_roster_overview",
    category: "executable",
    description:
      "Get the current roster overview. Shows this week's roster status (draft/published/locked), shift counts, total hours, pending leave requests, open coverage requests, and staff on leave today. Use when asked about rostering, shifts, who's working, or staff scheduling.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.MANAGE_ROSTER, Permissions.VIEW_ROSTER],
    statusMessage: "Checking roster overview...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_staff_schedule",
    category: "executable",
    description:
      "Get a specific staff member's schedule. Shows their shifts this week and next week, pending leave, and swap requests. Use when asked 'what shifts does [name] have?' or 'when is [name] working?'",
    parameters: {
      type: "object",
      properties: {
        staff_name: {
          type: "string",
          description: "Name or partial name of the staff member",
        },
      },
      required: ["staff_name"],
    },
    requiredPermissions: [Permissions.MANAGE_ROSTER, Permissions.VIEW_ROSTER],
    statusMessage: "Looking up staff schedule...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_coverage_gaps",
    category: "executable",
    description:
      "Get open coverage requests and unfilled shifts. Shows shifts that need relief staff, their urgency, reason, and whether anyone has been offered. Use when asked about coverage, relief staff, unfilled shifts, or 'who's missing?'",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [
      Permissions.MANAGE_COVERAGE,
      Permissions.MANAGE_ROSTER,
    ],
    statusMessage: "Checking coverage gaps...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_available_relief_staff",
    category: "executable",
    description:
      "Get available relief/casual staff for a given date. Shows who is available based on their recurring weekly availability and any date-specific overrides. Use when asked 'who can cover?', 'available casuals', or when needing to find relief staff.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "Date to check availability for (ISO format YYYY-MM-DD). Defaults to today if omitted.",
        },
      },
    },
    requiredPermissions: [
      Permissions.MANAGE_ROSTER,
      Permissions.MANAGE_COVERAGE,
    ],
    statusMessage: "Checking staff availability...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },

  // ── Module Q: Individual Learning Plans ─────────────────────
  {
    name: "get_student_learning_plan",
    category: "executable",
    description:
      "Get a student's current Individual Learning Plan (ILP). Shows plan status, goals with progress, strategies, support categories, next review date, and collaborators. Use when asked about a child's learning plan, IEP, individual plan, additional needs goals, or inclusion support.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The student's name to look up their ILP",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_ILP, Permissions.MANAGE_ILP],
    statusMessage: "Looking up learning plan...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_ilp_review_schedule",
    category: "executable",
    description:
      "Get upcoming ILP review dates and plans that are overdue for review. Shows which children need plan reviews, when they're due, and how many days overdue. Use when asked about ILP reviews, plan reviews, overdue reviews, or review schedule.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_ILP, Permissions.MANAGE_ILP],
    statusMessage: "Checking ILP review schedule...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_transition_statement_progress",
    category: "executable",
    description:
      "Get progress on transition-to-school statements. Shows how many children need transition statements this year, which are in progress, which have been shared with families and receiving schools. Use when asked about transition statements, transition to school, school readiness, or starting school.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Statement year. Defaults to current year.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_ILP,
      Permissions.MANAGE_TRANSITION_STATEMENTS,
    ],
    statusMessage: "Checking transition statement progress...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_daily_care_summary",
    category: "executable",
    description:
      "Get a summary of today's daily care log entries for all children or a specific child. Shows nappy changes, meals, bottles, sleep, and sunscreen records.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description:
            "Optional child name to filter by. If omitted, returns summary for all children.",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Defaults to today.",
        },
      },
    },
    requiredPermissions: [Permissions.VIEW_DAILY_CARE_LOGS],
    statusMessage: "Checking daily care records...",
    isWrite: false,
    sensitive: true, // contains intimate care details (nappy changes, feeding, sleep) — ST4S gated
    requiresConfirmation: false,
  },
  {
    name: "get_child_care_log_today",
    category: "executable",
    description:
      "Get detailed daily care log entries for a specific child today. Shows all nappy changes, meals, bottles, sleep periods, sunscreen applications, and wellbeing notes with timestamps.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description: "The child's name to look up care records for.",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_DAILY_CARE_LOGS],
    statusMessage: "Looking up care log...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },

  // ── School Photos (Module R) ──────────────────────────────
  {
    name: "get_photo_coverage",
    category: "executable",
    description:
      "Get photo coverage statistics for students and staff. Shows how many have profile photos, which groups have lowest coverage, and when the last photo session was held. Useful when admins ask 'which students still need photos?' or 'are we ready for ID cards?'.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_SCHOOL_PHOTOS],
    statusMessage: "Checking photo coverage...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },

  // ── Wellbeing & Pastoral Care (Module P) ─────────────────
  {
    name: "get_student_wellbeing_summary",
    category: "executable",
    description:
      "Get a student's open wellbeing flags, active referrals, and upcoming check-ins. Use when asked about a student's wellbeing status, pastoral concerns, or referral progress.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Student's first or last name (partial match supported)",
        },
      },
      required: ["name"],
    },
    requiredPermissions: [Permissions.VIEW_WELLBEING],
    statusMessage: "Looking up wellbeing information...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_wellbeing_dashboard",
    category: "executable",
    description:
      "Get the overall wellbeing dashboard: open flag counts by severity, pending referrals, upcoming check-ins, and uncontacted pastoral records across all students.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_WELLBEING],
    statusMessage: "Loading wellbeing dashboard...",
    isWrite: false,
    sensitive: true,
    requiresConfirmation: false,
  },
  {
    name: "get_volunteer_roster",
    category: "executable",
    description:
      "Get the upcoming volunteer assignment roster and WWCC compliance alerts. Shows volunteers with expired or expiring-soon WWCC checks, and lists confirmed/invited volunteers for upcoming excursions and events.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_VOLUNTEERS],
    statusMessage: "Loading volunteer roster...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },

  // ── Normalization Indicators ──────────────────────────────
  {
    name: "get_normalization_summary",
    category: "executable",
    description:
      "Get a student's normalization indicator summary. Shows the five Montessori normalization indicators (concentration, independence, order, coordination, social harmony) with latest ratings, trend direction, work cycle engagement depth, self-direction level, and active goals. Use when asked about a child's normalization, concentration, independence, self-direction, or developmental progress.",
    parameters: {
      type: "object",
      properties: {
        student_name: {
          type: "string",
          description:
            "The student's name (first, last, or full name) to look up.",
        },
      },
      required: ["student_name"],
    },
    requiredPermissions: [Permissions.VIEW_NORMALIZATION],
    statusMessage: "Loading normalization data...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },

  // ── Prepared Environment Planner ─────────────────────────
  {
    name: "get_environment_plan_summary",
    category: "executable",
    description:
      "Get the prepared environment planner summary. Shows active environment plans per location, upcoming material rotation schedules, overdue rotations, and shelf slot counts. Use when asked about environment plans, material rotations, seasonal changes, shelf layouts, or Montessori prepared environment status.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [Permissions.VIEW_ENVIRONMENT_PLANNER],
    statusMessage: "Loading environment plan data...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_accreditation_status",
    category: "executable",
    description:
      "Get the school's current Montessori accreditation status across all three bodies (AMI, AMS, MSAA). Returns active cycles, progress percentages, criteria met vs outstanding, and any cycles nearing submission deadline. Use when asked about accreditation, AMI status, AMS checklist, MSAA progress, or whether the school is accredited.",
    parameters: {
      type: "object",
      properties: {
        body_code: {
          type: "string",
          enum: ["ami", "ams", "msaa"],
          description: "Filter to a specific accrediting body (optional)",
        },
      },
    },
    requiredPermissions: [Permissions.VIEW_ACCREDITATION],
    statusMessage: "Loading accreditation status...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  {
    name: "get_cosmic_education_plan",
    category: "executable",
    description:
      "Get an overview of the school's cosmic education unit plans and Great Lesson coverage. Returns active, draft, and completed units grouped by Great Lesson, participant counts, and per-unit completion percentages. Use when asked about cosmic education, the Great Lessons, cultural studies, integrated unit planning, Montessori 6–12 programme units, or student progress across cosmic studies.",
    parameters: {
      type: "object",
      properties: {
        lesson_key: {
          type: "string",
          enum: [
            "story_of_universe",
            "story_of_life",
            "story_of_humans",
            "story_of_communication",
            "story_of_numbers",
            "custom",
          ],
          description:
            "Filter to a specific Great Lesson (optional). Omit to return all units.",
        },
        status: {
          type: "string",
          enum: ["draft", "active", "completed", "archived"],
          description: "Filter by unit status (optional).",
        },
      },
    },
    requiredPermissions: [Permissions.VIEW_COSMIC_EDUCATION],
    statusMessage: "Loading cosmic education data...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Grant Tracking ────────────────────────────────────────────
  {
    name: "get_grant_tracking_summary",
    category: "executable",
    description:
      "Get grant tracking summary for the school. Shows active grants, total awarded vs spent, upcoming acquittals (next 90 days), overdue milestones, and per-grant spend percentages. Use when asked about grants, grant funding, acquittals, grant expenditure, grant milestones, or funding body status.",
    parameters: {
      type: "object",
      properties: {
        grant_name: {
          type: "string",
          description:
            "Optional: specific grant name to look up. Omit for full summary.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_GRANT_TRACKING,
      Permissions.MANAGE_GRANT_TRACKING,
    ],
    statusMessage: "Loading grant tracking data...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Fee Notice Communications ──────────────────────────────
  {
    name: "get_fee_notice_summary",
    category: "executable",
    description:
      "Get the fee notice communications summary. Shows pending notices awaiting approval, recent send history, delivery stats by channel, and overdue invoices that haven't been notified. Use when asked about billing communications, fee notices, parent payment reminders, or overdue invoice notifications.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [
      Permissions.VIEW_FEE_NOTICE_COMMS,
      Permissions.MANAGE_FEE_NOTICE_COMMS,
    ],
    statusMessage: "Checking fee notice communications...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Recurring Billing / Direct Debit ────────────────────────
  {
    name: "get_recurring_billing_status",
    category: "executable",
    description:
      "Get recurring billing and direct debit status. Shows active setups, collection methods (BECS/card), next collection dates, recent payment attempts, failed payments, and CCS gap fee setups. Use when asked about direct debit, recurring billing, BECS, automatic payments, failed collections, payment retries, or gap fee billing.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiredPermissions: [
      Permissions.VIEW_RECURRING_BILLING,
      Permissions.MANAGE_RECURRING_BILLING,
    ],
    statusMessage: "Loading recurring billing data...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
  // ── Newsletter ─────────────────────────────────────────────────
  {
    name: "get_newsletter_summary",
    category: "executable",
    description:
      "Get newsletter summary and analytics. Shows recent newsletters (drafts, scheduled, sent), open rates, recipient counts, templates available, and overall engagement stats. Use when asked about newsletters, newsletter analytics, open rates, email campaigns, or newsletter drafts.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Optional: filter by status - draft, scheduled, sending, sent, or cancelled. Omit for full summary.",
        },
      },
    },
    requiredPermissions: [
      Permissions.VIEW_NEWSLETTER,
      Permissions.MANAGE_NEWSLETTER,
    ],
    statusMessage: "Loading newsletter data...",
    isWrite: false,
    sensitive: false,
    requiresConfirmation: false,
  },
];

// ============================================================
// suggest_actions tool definition (suggestion-only, not executable)
// ============================================================
// This was previously defined in ask-wattle.ts. Centralised here
// so buildToolsForOpenAI returns ALL tools from one place.

const SUGGEST_ACTIONS_TOOL: WattleToolDef = {
  name: "suggest_actions",
  category: "suggestion",
  description:
    "Suggest platform actions the user can take. Call this proactively whenever the user's question relates to a feature or page in the app. Prefer action buttons over step-by-step instructions.",
  parameters: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action_id: {
              type: "string",
              description: "The action ID from the available actions list",
            },
            label: {
              type: "string",
              description:
                "A short, contextual, action-oriented label. Use the user's context to make it specific. Good: 'Take today\\'s roll call', 'Record an observation', 'Check attendance history'. Bad: 'Go to Attendance', 'Navigate to page'. Start with a verb.",
            },
          },
          required: ["action_id", "label"],
        },
        maxItems: 3,
      },
    },
    required: ["actions"],
  },
  requiredPermissions: [], // Handled by the action registry's own permission filter
  statusMessage: "",
  isWrite: false,
  sensitive: false,
  requiresConfirmation: false,
};

// ============================================================
// buildToolsForOpenAI
// ============================================================
// Returns the ChatCompletionTool[] array for the OpenAI API call.
// Filters executable tools by the user's permissions (OR logic).
// Always includes suggest_actions (its own filtering happens in
// the system prompt via getAvailableActions).

export function buildToolsForOpenAI(
  userPermissions: string[],
  _userRole?: string,
  sensitiveToolsEnabled: boolean = false,
): ChatCompletionTool[] {
  const tools: ChatCompletionTool[] = [];

  for (const def of TOOL_REGISTRY) {
    // ST4S compliance: exclude sensitive tools unless tenant has opted in
    if (def.sensitive && !sensitiveToolsEnabled) continue;

    // Permission gate: user needs ANY of the required permissions
    if (def.requiredPermissions.length > 0) {
      const hasPermission = def.requiredPermissions.some((p) =>
        userPermissions.includes(p),
      );
      if (!hasPermission) continue;
    }

    tools.push({
      type: "function",
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      },
    });
  }

  // Always include suggest_actions
  tools.push({
    type: "function",
    function: {
      name: SUGGEST_ACTIONS_TOOL.name,
      description: SUGGEST_ACTIONS_TOOL.description,
      parameters: SUGGEST_ACTIONS_TOOL.parameters,
    },
  });

  return tools;
}

// ============================================================
// Tool Classification Helpers
// ============================================================

/** Returns true if this tool needs execution and results sent back to GPT */
export function isExecutableTool(toolName: string): boolean {
  const def = TOOL_REGISTRY.find((t) => t.name === toolName);
  return def?.category === "executable";
}

/** Get the status message for a tool (shown in UI during execution) */
export function getToolStatusMessage(toolName: string): string {
  const def = TOOL_REGISTRY.find((t) => t.name === toolName);
  return def?.statusMessage ?? "Working on it...";
}

/** Returns true if this is the UI highlight guidance tool */
export function isHighlightTool(toolName: string): boolean {
  return toolName === "highlight_ui_elements";
}

/** Returns true if this tool modifies data */
export function isWriteTool(toolName: string): boolean {
  const def = TOOL_REGISTRY.find((t) => t.name === toolName);
  return def?.isWrite ?? false;
}

/** Returns true if this tool accesses sensitive student data (medical, custody, etc.)
 *  Used by the audit logger in ask-wattle.ts to log APP 8 compliance records. */
export function isSensitiveTool(toolName: string): boolean {
  const def = TOOL_REGISTRY.find((t) => t.name === toolName);
  return def?.sensitive ?? false;
}

// ============================================================
// Name Resolution Helpers
// ============================================================

/**
 * Resolve a class name to a class ID via case-insensitive matching.
 * With 3-8 classes per Montessori school, simple substring is enough.
 *
 * Uses the pre-created Supabase client (not listClasses()) to avoid
 * cookies() calls inside the streaming context.
 */
export async function resolveClassName(
  supabase: SupabaseClient,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error || !data) return null;

  const normalized = name.toLowerCase().trim();

  // Try exact match first
  const exact = data.find((c) => c.name.toLowerCase() === normalized);
  if (exact) return { id: exact.id, name: exact.name };

  // Try substring match
  const partial = data.find((c) => c.name.toLowerCase().includes(normalized));
  if (partial) return { id: partial.id, name: partial.name };

  return null;
}

/**
 * Get all class names for error messages.
 */
export async function getClassNames(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data.map((c) => c.name);
}

/**
 * Resolve a student name to matching students.
 * Queries the students table directly with ilike search on
 * first_name, last_name, preferred_name - same logic as
 * listStudents() but using the pre-created Supabase client.
 */
export async function resolveStudentByName(
  supabase: SupabaseClient,
  name: string,
): Promise<
  Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    enrollment_status: string;
  }>
> {
  const searchTerm = `%${name}%`;
  const { data, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, preferred_name, enrollment_status")
    .is("deleted_at", null)
    .or(
      `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},preferred_name.ilike.${searchTerm}`,
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(5);

  if (error || !data) return [];
  return data.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    preferred_name: s.preferred_name,
    enrollment_status: s.enrollment_status,
  }));
}

/**
 * Get class names for a student's active enrollments.
 */
async function getStudentClassNames(
  supabase: SupabaseClient,
  studentId: string,
): Promise<string[]> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class:classes(name)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("deleted_at", null);

  return (enrollments ?? [])
    .map((e) => {
      const cls = (e as Record<string, unknown>).class as {
        name: string;
      } | null;
      return cls?.name;
    })
    .filter((n): n is string => Boolean(n));
}

// ============================================================
// Tool Execution Dispatcher
// ============================================================

export async function executeWattleTool(
  toolCallId: string,
  toolName: string,
  argsString: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  // Parse arguments
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsString) as Record<string, unknown>;
  } catch {
    return {
      tool_call_id: toolCallId,
      tool_name: toolName,
      success: false,
      content: "Failed to parse tool arguments.",
    };
  }

  // Double-validate permissions (defense-in-depth)
  const def = TOOL_REGISTRY.find((t) => t.name === toolName);
  if (!def) {
    return {
      tool_call_id: toolCallId,
      tool_name: toolName,
      success: false,
      content: `Unknown tool: ${toolName}`,
    };
  }
  if (def.requiredPermissions.length > 0) {
    const hasPermission = def.requiredPermissions.some((p) =>
      ctx.permissions.includes(p),
    );
    if (!hasPermission) {
      return {
        tool_call_id: toolCallId,
        tool_name: toolName,
        success: false,
        content: "You don't have permission to perform this action.",
      };
    }
  }

  // Rate limit write operations
  if (def.isWrite) {
    const rateCheck = checkWriteRateLimit(ctx.userId);
    if (!rateCheck.allowed) {
      const waitSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      return {
        tool_call_id: toolCallId,
        tool_name: toolName,
        success: false,
        content: `Too many write operations - please wait ${waitSec} seconds before trying again.`,
      };
    }
  }

  // Dispatch to handler
  try {
    switch (toolName) {
      case "list_classes":
        return await handleListClasses(toolCallId, ctx);
      case "lookup_student":
        return await handleLookupStudent(toolCallId, args, ctx);
      case "check_attendance":
        return await handleCheckAttendance(toolCallId, args, ctx);
      case "mark_attendance":
        return await handleMarkAttendance(toolCallId, args, ctx);
      case "get_class_roster":
        return await handleGetClassRoster(toolCallId, args, ctx);
      case "get_student_attendance_history":
        return await handleGetStudentAttendanceHistory(toolCallId, args, ctx);
      case "get_absent_students_today":
        return await handleGetAbsentStudentsToday(toolCallId, args, ctx);
      case "get_student_observations":
        return await handleGetStudentObservations(toolCallId, args, ctx);
      case "get_student_mastery_summary":
        return await handleGetStudentMasterySummary(toolCallId, args, ctx);
      case "get_student_medical_info":
        return await handleGetStudentMedicalInfo(toolCallId, args, ctx);
      case "get_child_medical_alerts":
        return await handleGetChildMedicalAlerts(toolCallId, args, ctx);
      case "get_emergency_contacts":
        return await handleGetEmergencyContacts(toolCallId, args, ctx);
      case "get_custody_restrictions":
        return await handleGetCustodyRestrictions(toolCallId, args, ctx);
      case "get_recent_announcements":
        return await handleGetRecentAnnouncements(toolCallId, args, ctx);
      case "get_upcoming_events":
        return await handleGetUpcomingEvents(toolCallId, args, ctx);
      case "get_program_session_status":
        return await handleGetProgramSessionStatus(toolCallId, args, ctx);
      case "get_daily_summary":
        return await handleGetDailySummary(toolCallId, args, ctx);
      case "get_my_timesheet_status":
        return await handleGetMyTimesheetStatus(toolCallId, args, ctx);
      case "bulk_mark_attendance":
        return await handleBulkMarkAttendance(toolCallId, args, ctx);
      case "check_in_student":
        return await handleCheckInStudent(toolCallId, args, ctx);
      case "check_out_student":
        return await handleCheckOutStudent(toolCallId, args, ctx);
      case "log_time_entry":
        return await handleLogTimeEntry(toolCallId, args, ctx);
      case "get_staff_compliance_status":
        return await handleGetStaffComplianceStatus(toolCallId, args, ctx);
      case "get_current_ratios":
        return await handleGetCurrentRatios(toolCallId, args, ctx);
      case "get_ratio_breach_history":
        return await handleGetRatioBreachHistory(toolCallId, args, ctx);
      case "get_immunisation_compliance":
        return await handleGetImmunisationCompliance(toolCallId, args, ctx);
      case "get_ccs_reporting_summary":
        return await handleGetCcsReportingSummary(toolCallId, args, ctx);
      case "get_emergency_drill_compliance":
        return await handleGetEmergencyDrillCompliance(toolCallId, args, ctx);
      case "get_emergency_coordination_status":
        return await handleGetEmergencyCoordinationStatus(
          toolCallId,
          args,
          ctx,
        );
      case "get_pending_excursion_consents":
        return await handleGetPendingExcursionConsents(toolCallId, args, ctx);
      case "get_lesson_history":
        return await handleGetLessonHistory(toolCallId, args, ctx);
      case "suggest_next_lesson":
        return await handleSuggestNextLesson(toolCallId, args, ctx);
      case "get_mqap_readiness":
        return await handleGetMqapReadiness(toolCallId, args, ctx);
      case "draft_observation":
        return await handleDraftObservation(toolCallId, args, ctx);
      case "get_qip_suggestions":
        return await handleGetQipSuggestions(toolCallId, args, ctx);
      case "draft_incident_report":
        return await handleDraftIncidentReport(toolCallId, args, ctx);
      case "draft_policy":
        return await handleDraftPolicy(toolCallId, args, ctx);
      case "draft_risk_assessment":
        return await handleDraftRiskAssessment(toolCallId, args, ctx);
      case "draft_parent_comms":
        return await handleDraftParentComms(toolCallId, args, ctx);
      case "draft_medication_plan":
        return await handleDraftMedicationPlan(toolCallId, args, ctx);
      case "draft_staff_compliance_action":
        return await handleDraftStaffComplianceAction(toolCallId, args, ctx);
      case "highlight_ui_elements":
        return handleHighlightUiElements(toolCallId, args);
      case "get_roster_overview":
        return await handleGetRosterOverview(toolCallId, ctx);
      case "get_staff_schedule":
        return await handleGetStaffSchedule(toolCallId, args, ctx);
      case "get_coverage_gaps":
        return await handleGetCoverageGaps(toolCallId, ctx);
      case "get_available_relief_staff":
        return await handleGetAvailableReliefStaff(toolCallId, args, ctx);
      case "get_student_learning_plan":
        return await handleGetStudentLearningPlan(toolCallId, args, ctx);
      case "get_ilp_review_schedule":
        return await handleGetIlpReviewSchedule(toolCallId, ctx);
      case "get_transition_statement_progress":
        return await handleGetTransitionStatementProgress(
          toolCallId,
          args,
          ctx,
        );
      case "get_daily_care_summary":
        return await handleGetDailyCareSummary(toolCallId, args, ctx);
      case "get_child_care_log_today":
        return await handleGetChildCareLogToday(toolCallId, args, ctx);
      case "get_photo_coverage":
        return await handleGetPhotoCoverage(toolCallId, ctx);
      case "get_student_wellbeing_summary":
        return await handleGetStudentWellbeingSummary(toolCallId, args, ctx);
      case "get_wellbeing_dashboard":
        return await handleGetWellbeingDashboard(toolCallId, ctx);
      case "get_volunteer_roster":
        return await handleGetVolunteerRoster(toolCallId, ctx);
      case "get_normalization_summary":
        return await handleGetNormalizationSummary(toolCallId, args, ctx);
      case "get_unexplained_absences":
        return await handleGetUnexplainedAbsences(toolCallId, args, ctx);
      case "get_environment_plan_summary":
        return await handleGetEnvironmentPlanSummary(toolCallId, ctx);
      case "get_accreditation_status":
        return await handleGetAccreditationStatus(toolCallId, args, ctx);
      case "get_cosmic_education_plan":
        return await handleGetCosmicEducationPlan(toolCallId, args, ctx);
      case "get_grant_tracking_summary":
        return await handleGetGrantTrackingSummary(toolCallId, args, ctx);
      case "get_fee_notice_summary":
        return await handleGetFeeNoticeSummary(toolCallId, ctx);
      case "get_recurring_billing_status":
        return await handleGetRecurringBillingStatus(toolCallId, ctx);
      case "get_newsletter_summary":
        return await handleGetNewsletterSummary(toolCallId, args, ctx);
      default:
        return {
          tool_call_id: toolCallId,
          tool_name: toolName,
          success: false,
          content: `Tool '${toolName}' is not implemented yet.`,
        };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tool execution failed";
    return {
      tool_call_id: toolCallId,
      tool_name: toolName,
      success: false,
      content: `Error: ${message}`,
    };
  }
}

// ============================================================
// Glow Guidance Handler (no DB access needed)
// ============================================================

/**
 * Returns highlight directives as structured data. The stream
 * builder intercepts this and emits a "highlight" SSE event
 * to the frontend. GPT gets a simple confirmation string.
 */
function handleHighlightUiElements(
  toolCallId: string,
  args: Record<string, unknown>,
): WattleToolResult {
  const highlights = (args.highlights ?? []) as GlowHighlight[];
  const workflowTitle = args.workflow_title as string | undefined;

  // Assign step numbers if missing (default all to step 1)
  const normalised = highlights.map((h, i) => ({
    ...h,
    step: h.step ?? i + 1,
  }));

  const totalSteps = Math.max(...normalised.map((h) => h.step ?? 1), 1);

  return {
    tool_call_id: toolCallId,
    tool_name: "highlight_ui_elements",
    success: true,
    content: `Highlighted ${normalised.length} element${normalised.length === 1 ? "" : "s"} on the user's screen${workflowTitle ? ` for "${workflowTitle}"` : ""}.`,
    structured: {
      type: "highlight_directive",
      data: {
        highlights: normalised,
        workflow_title: workflowTitle,
        total_steps: totalSteps,
      },
    },
  };
}

// ============================================================
// Tool Handlers
// ============================================================

/**
 * List all classes with student counts.
 * Queries Supabase directly via the pre-created client.
 */
async function handleListClasses(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  // Get all classes
  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, name, room")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (classError || !classes) {
    return {
      tool_call_id: toolCallId,
      tool_name: "list_classes",
      success: false,
      content: `Failed to list classes: ${classError?.message ?? "Unknown error"}`,
    };
  }

  if (classes.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "list_classes",
      success: true,
      content: "No classes found at this school.",
    };
  }

  // Count active enrollments per class
  const classIds = classes.map((c) => c.id);
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class_id")
    .in("class_id", classIds)
    .eq("status", "active")
    .is("deleted_at", null);

  const counts: Record<string, number> = {};
  for (const e of enrollments ?? []) {
    counts[e.class_id] = (counts[e.class_id] ?? 0) + 1;
  }

  const lines = classes.map(
    (c) =>
      `- ${c.name}${c.room ? ` (Room: ${c.room})` : ""}: ${counts[c.id] ?? 0} active students`,
  );

  return {
    tool_call_id: toolCallId,
    tool_name: "list_classes",
    success: true,
    content: `Classes at this school:\n${lines.join("\n")}`,
    structured: {
      type: "class_list",
      data: {
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          room: c.room ?? null,
          student_count: counts[c.id] ?? 0,
        })),
      },
    },
  };
}

/**
 * Look up a student by name.
 * Uses the pre-created Supabase client for all queries.
 *
 * Single match → student_info card.
 * Multiple matches → disambiguation card with clickable options.
 */
async function handleLookupStudent(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const name = (args.name as string) ?? "";
  if (!name.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "lookup_student",
      success: false,
      content: "Please provide a student name to search for.",
    };
  }

  const matches = await resolveStudentByName(supabase, name);

  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "lookup_student",
      success: true,
      content: `No students found matching "${name}".`,
    };
  }

  // Build details for each match (need class info for both single and multi)
  const enriched: Array<{
    student: (typeof matches)[0];
    displayName: string;
    classNames: string[];
  }> = [];

  for (const student of matches) {
    const displayName = student.preferred_name
      ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
      : `${student.first_name} ${student.last_name}`;

    const classNames = await getStudentClassNames(supabase, student.id);
    enriched.push({ student, displayName, classNames });
  }

  // Single match → student_info card
  if (matches.length === 1) {
    const { student, displayName, classNames } = enriched[0];
    const classInfo =
      classNames.length > 0
        ? `enrolled in ${classNames.join(", ")}`
        : "not enrolled in a class";

    return {
      tool_call_id: toolCallId,
      tool_name: "lookup_student",
      success: true,
      content: `Found student:\n- ${displayName} - ${classInfo} (status: ${student.enrollment_status})`,
      structured: {
        type: "student_info",
        data: {
          student_id: student.id,
          display_name: displayName,
          first_name: student.first_name,
          last_name: student.last_name,
          preferred_name: student.preferred_name,
          enrollment_status: student.enrollment_status,
          class_names: classNames,
        },
      },
    };
  }

  // Multiple matches → disambiguation card
  const details = enriched.map(
    ({ displayName, classNames, student }) =>
      `- ${displayName} - ${classNames.length > 0 ? `enrolled in ${classNames.join(", ")}` : "not enrolled"} (status: ${student.enrollment_status})`,
  );

  return {
    tool_call_id: toolCallId,
    tool_name: "lookup_student",
    success: true,
    content: `Found ${matches.length} students matching "${name}":\n${details.join("\n")}`,
    structured: {
      type: "disambiguation",
      data: {
        query: name,
        context: "Which student did you mean?",
        options: enriched.map(({ student, displayName, classNames }) => ({
          student_id: student.id,
          display_name: displayName,
          class_name: classNames[0] ?? null,
          enrollment_status: student.enrollment_status,
        })),
      },
    },
  };
}

/**
 * Check attendance for a class on a given date.
 * Mirrors the logic in getClassAttendance() but queries Supabase directly
 * using the pre-created client.
 */
async function handleCheckAttendance(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const className = (args.class_name as string) ?? "";
  const date = (args.date as string) ?? getTodayDate();

  if (!className.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_attendance",
      success: false,
      content: "Please specify a class name.",
    };
  }

  // Resolve class name
  const resolvedClass = await resolveClassName(supabase, className);
  if (!resolvedClass) {
    const available = await getClassNames(supabase);
    return {
      tool_call_id: toolCallId,
      tool_name: "check_attendance",
      success: false,
      content: `No class found matching "${className}". Available classes: ${available.join(", ") || "none found"}.`,
    };
  }

  // Get active enrollments
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(
      "student_id, student:students(id, first_name, last_name, preferred_name)",
    )
    .eq("class_id", resolvedClass.id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (enrollError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_attendance",
      success: false,
      content: `Failed to look up students: ${enrollError.message}`,
    };
  }

  const students = (enrollments ?? [])
    .filter((e) => (e as Record<string, unknown>).student)
    .map((e) => {
      const s = (e as Record<string, unknown>).student as {
        id: string;
        first_name: string;
        last_name: string;
        preferred_name: string | null;
      };
      return { studentId: e.student_id as string, ...s };
    });

  if (students.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_attendance",
      success: true,
      content: `${resolvedClass.name} has no actively enrolled students.`,
    };
  }

  // Get attendance records
  const studentIds = students.map((s) => s.studentId);
  const { data: records, error: recError } = await supabase
    .from("attendance_records")
    .select("student_id, status, notes")
    .eq("date", date)
    .in("student_id", studentIds)
    .is("deleted_at", null);

  if (recError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_attendance",
      success: false,
      content: `Failed to check records: ${recError.message}`,
    };
  }

  const recordMap = new Map<string, { status: string; notes: string | null }>();
  for (const r of (records ?? []) as Array<{
    student_id: string;
    status: string;
    notes: string | null;
  }>) {
    recordMap.set(r.student_id, { status: r.status, notes: r.notes });
  }

  // Tally and collect names
  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    half_day: 0,
    unmarked: 0,
  };
  const unmarkedNames: string[] = [];
  const absentNames: string[] = [];
  const lateNames: string[] = [];

  for (const student of students) {
    const record = recordMap.get(student.studentId);
    const displayName = student.preferred_name ?? student.first_name;
    const fullDisplay = `${displayName} ${student.last_name}`;

    if (!record) {
      counts.unmarked++;
      unmarkedNames.push(fullDisplay);
    } else {
      const status = record.status as keyof typeof counts;
      if (status in counts) counts[status]++;
      if (record.status === "absent") absentNames.push(fullDisplay);
      if (record.status === "late") lateNames.push(fullDisplay);
    }
  }

  // Format the date for display
  const dateDisplay = formatDateForDisplay(date);
  const lines: string[] = [];
  lines.push(
    `Attendance for ${resolvedClass.name} on ${dateDisplay}: ${students.length} students total.`,
  );

  if (counts.unmarked === students.length) {
    lines.push("Roll call has NOT been taken yet - no students are marked.");
  } else if (counts.unmarked === 0) {
    lines.push("Roll call is COMPLETE - all students are marked.");
    lines.push(
      `Present: ${counts.present}, Absent: ${counts.absent}, Late: ${counts.late}, Excused: ${counts.excused}, Half-day: ${counts.half_day}.`,
    );
  } else {
    lines.push(
      `Marked: ${students.length - counts.unmarked}/${students.length}. Present: ${counts.present}, Absent: ${counts.absent}, Late: ${counts.late}, Excused: ${counts.excused}, Half-day: ${counts.half_day}.`,
    );
    lines.push(`Not yet marked: ${unmarkedNames.join(", ")}.`);
  }

  if (absentNames.length > 0) lines.push(`Absent: ${absentNames.join(", ")}.`);
  if (lateNames.length > 0) lines.push(`Late: ${lateNames.join(", ")}.`);

  return {
    tool_call_id: toolCallId,
    tool_name: "check_attendance",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "attendance_summary",
      data: {
        class_name: resolvedClass.name,
        date,
        date_display: dateDisplay,
        total_students: students.length,
        counts,
        roll_complete: counts.unmarked === 0,
        unmarked_names: unmarkedNames,
        absent_names: absentNames,
        late_names: lateNames,
      },
    },
  };
}

/**
 * Mark a student's attendance.
 * Mirrors the upsert pattern from markAttendance() server action.
 * Uses the pre-created Supabase client for all queries.
 *
 * Now captures the previous status (if any) before upserting so
 * the revert system can restore the original state.
 */
async function handleMarkAttendance(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const status = (args.status as AttendanceStatus) ?? "";
  const className = (args.class_name as string) ?? "";
  const date = (args.date as string) ?? getTodayDate();
  const notes = (args.notes as string) ?? null;

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "mark_attendance",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const validStatuses: AttendanceStatus[] = [
    "present",
    "absent",
    "late",
    "excused",
    "half_day",
  ];
  if (!validStatuses.includes(status)) {
    return {
      tool_call_id: toolCallId,
      tool_name: "mark_attendance",
      success: false,
      content: `Invalid status "${status}". Must be one of: ${validStatuses.join(", ")}.`,
    };
  }

  // Resolve student
  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "mark_attendance",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }

  // If multiple matches, return disambiguation card
  let selectedStudent = matches[0];
  if (matches.length > 1) {
    if (className.trim()) {
      // Try to narrow by class
      const resolvedClass = await resolveClassName(supabase, className);
      if (resolvedClass) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("class_id", resolvedClass.id)
          .in(
            "student_id",
            matches.map((m) => m.id),
          )
          .eq("status", "active")
          .is("deleted_at", null);

        const enrolledIds = new Set(
          (enrollments ?? []).map((e) => e.student_id),
        );
        const narrowed = matches.filter((m) => enrolledIds.has(m.id));

        if (narrowed.length === 1) {
          selectedStudent = narrowed[0];
        } else {
          // Still ambiguous - return disambiguation card
          const options = await buildDisambiguationOptions(supabase, matches);
          return {
            tool_call_id: toolCallId,
            tool_name: "mark_attendance",
            success: false,
            content: `Found ${matches.length} students matching "${studentName}": ${matches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}. Please specify which one.`,
            structured: {
              type: "disambiguation",
              data: {
                query: studentName,
                context: `Which student should I mark as ${status}?`,
                options,
              },
            },
          };
        }
      }
    } else {
      // No class provided - return disambiguation card
      const options = await buildDisambiguationOptions(supabase, matches);
      return {
        tool_call_id: toolCallId,
        tool_name: "mark_attendance",
        success: false,
        content: `Found ${matches.length} students matching "${studentName}": ${matches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}. Please specify which one, or include their class name.`,
        structured: {
          type: "disambiguation",
          data: {
            query: studentName,
            context: `Which student should I mark as ${status}?`,
            options,
          },
        },
      };
    }
  }

  // Resolve class ID (optional - for the attendance record)
  let classId: string | null = null;
  if (className.trim()) {
    const resolvedClass = await resolveClassName(supabase, className);
    if (resolvedClass) classId = resolvedClass.id;
  } else {
    // Try to get the student's primary class from enrollment
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", selectedStudent.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1);

    if (enrollments && enrollments.length > 0) {
      classId = enrollments[0].class_id;
    }
  }

  const tenantId = ctx.tenantId;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "mark_attendance",
      success: false,
      content: "Could not determine your school context.",
    };
  }

  // Capture previous status BEFORE upserting (for revert)
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("student_id", selectedStudent.id)
    .eq("date", date)
    .is("deleted_at", null)
    .maybeSingle();

  const previousStatus = (existing?.status as AttendanceStatus | null) ?? null;

  const { data, error } = await supabase
    .from("attendance_records")
    .upsert(
      {
        tenant_id: tenantId,
        student_id: selectedStudent.id,
        class_id: classId,
        date,
        status,
        notes,
        recorded_by: ctx.userId,
        deleted_at: null,
      },
      { onConflict: "tenant_id,student_id,date" },
    )
    .select()
    .single();

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "mark_attendance",
      success: false,
      content: `Failed to mark attendance: ${error.message}`,
    };
  }

  const displayName = selectedStudent.preferred_name
    ? `${selectedStudent.first_name} "${selectedStudent.preferred_name}" ${selectedStudent.last_name}`
    : `${selectedStudent.first_name} ${selectedStudent.last_name}`;

  const dateDisplay = formatDateForDisplay(date);

  return {
    tool_call_id: toolCallId,
    tool_name: "mark_attendance",
    success: true,
    content: `Done! Marked ${displayName} as ${status} for ${dateDisplay}.${notes ? ` Notes: ${notes}` : ""}`,
    structured: {
      type: "attendance_confirmation",
      data: {
        student_name: displayName,
        student_id: selectedStudent.id,
        status,
        date,
        date_display: dateDisplay,
        notes,
        record_id: (data as { id: string }).id,
        previous_status: previousStatus,
      },
    },
    revert: {
      revert_action: previousStatus
        ? "restore_attendance_status"
        : "delete_attendance",
      args: {
        record_id: (data as { id: string }).id,
        student_id: selectedStudent.id,
        date,
        tenant_id: tenantId,
        ...(previousStatus ? { previous_status: previousStatus } : {}),
      },
      label: "Undo",
      performed_at: new Date().toISOString(),
    },
  };
}

// ============================================================
// Disambiguation Helper
// ============================================================

async function buildDisambiguationOptions(
  supabase: SupabaseClient,
  matches: Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    enrollment_status: string;
  }>,
): Promise<
  Array<{
    student_id: string;
    display_name: string;
    class_name: string | null;
    enrollment_status: string;
  }>
> {
  const options = [];
  for (const m of matches) {
    const displayName = m.preferred_name
      ? `${m.first_name} "${m.preferred_name}" ${m.last_name}`
      : `${m.first_name} ${m.last_name}`;

    const classNames = await getStudentClassNames(supabase, m.id);
    options.push({
      student_id: m.id,
      display_name: displayName,
      class_name: classNames[0] ?? null,
      enrollment_status: m.enrollment_status,
    });
  }
  return options;
}

// ============================================================
// Utility Functions
// ============================================================

/** Get today's date in YYYY-MM-DD format (Australia/Sydney timezone) */
export function getTodayDate(): string {
  const now = new Date();
  return now
    .toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
    .split("/")
    .join("-"); // en-CA gives YYYY-MM-DD format
}

/** Format a YYYY-MM-DD date string for natural display */
export function formatDateForDisplay(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ============================================================
// Module N: Staff Rostering Handlers
// ============================================================

async function handleGetRosterOverview(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();

  // Get current week start (Monday)
  const d = new Date(today);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const weekStart = d.toISOString().split("T")[0];
  const weekEnd = new Date(d.getTime() + 6 * 86400000)
    .toISOString()
    .split("T")[0];

  const [weekRes, shiftsRes, leaveRes, coverageRes] = await Promise.all([
    supabase
      .from("roster_weeks")
      .select("*")
      .eq("week_start_date", weekStart)
      .maybeSingle(),
    supabase
      .from("shifts")
      .select("user_id, expected_hours, status")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .neq("status", "cancelled"),
    supabase
      .from("leave_requests")
      .select("id", { count: "exact" })
      .eq("status", "pending"),
    supabase
      .from("shift_coverage_requests")
      .select("id", { count: "exact" })
      .in("status", ["open", "offered"]),
  ]);

  const week = weekRes.data as {
    status: string;
    week_start_date: string;
  } | null;
  const shifts = (shiftsRes.data ?? []) as Array<{
    user_id: string;
    expected_hours: number;
  }>;
  const totalHours = shifts.reduce((sum, s) => sum + s.expected_hours, 0);
  const uniqueStaff = new Set(shifts.map((s) => s.user_id)).size;

  const lines = [
    `**Roster Overview for week of ${weekStart}**`,
    week ? `Status: ${week.status}` : "No roster created for this week yet",
    `Shifts: ${shifts.length} across ${uniqueStaff} staff (${totalHours.toFixed(1)}h total)`,
    `Pending leave requests: ${leaveRes.count ?? 0}`,
    `Open coverage requests: ${coverageRes.count ?? 0}`,
  ];

  return {
    tool_call_id: toolCallId,
    tool_name: "get_roster_overview",
    success: true,
    content: lines.join("\n"),
  };
}

async function handleGetStaffSchedule(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const staffName = (args.staff_name as string) ?? "";
  const today = getTodayDate();

  // Find user by name
  const { data: users } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .or(`first_name.ilike.%${staffName}%,last_name.ilike.%${staffName}%`)
    .limit(3);

  if (!users || users.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_staff_schedule",
      success: true,
      content: `No staff member found matching "${staffName}".`,
    };
  }

  const user = users[0] as {
    id: string;
    first_name: string;
    last_name: string;
  };

  // Get this week and next week
  const d = new Date(today);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const weekStart = d.toISOString().split("T")[0];
  const nextWeekEnd = new Date(d.getTime() + 13 * 86400000)
    .toISOString()
    .split("T")[0];

  const [shiftsRes, leaveRes] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "date, start_time, end_time, shift_role, expected_hours, status, class:classes(name)",
      )
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", nextWeekEnd)
      .neq("status", "cancelled")
      .order("date")
      .order("start_time"),
    supabase
      .from("leave_requests")
      .select("leave_type, start_date, end_date, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .gte("end_date", today)
      .order("start_date"),
  ]);

  const shifts = (shiftsRes.data ?? []) as Array<Record<string, unknown>>;
  const leave = (leaveRes.data ?? []) as Array<{
    leave_type: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;

  const lines = [`**Schedule for ${user.first_name} ${user.last_name}**`, ""];

  if (shifts.length === 0) {
    lines.push("No shifts scheduled for the next two weeks.");
  } else {
    for (const s of shifts) {
      const cls = s.class as { name: string } | null;
      lines.push(
        `- ${s.date} ${s.start_time}–${s.end_time} (${s.shift_role}, ${s.expected_hours}h)${cls ? ` - ${cls.name}` : ""}`,
      );
    }
  }

  if (leave.length > 0) {
    lines.push("", "**Leave:**");
    for (const l of leave) {
      lines.push(
        `- ${l.leave_type}: ${l.start_date} to ${l.end_date} (${l.status})`,
      );
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_staff_schedule",
    success: true,
    content: lines.join("\n"),
  };
}

async function handleGetCoverageGaps(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  const { data } = await supabase
    .from("shift_coverage_requests")
    .select(
      `
      urgency, reason, status,
      original_user:users!shift_coverage_requests_original_user_id_fkey(first_name, last_name),
      original_shift:shifts!shift_coverage_requests_original_shift_id_fkey(date, start_time, end_time, shift_role, class:classes(name))
    `,
    )
    .in("status", ["open", "offered"])
    .order("urgency", { ascending: false })
    .order("created_at")
    .limit(20);

  const requests = (data ?? []) as Array<Record<string, unknown>>;

  if (requests.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_coverage_gaps",
      success: true,
      content: "No open coverage requests - all shifts are currently covered.",
    };
  }

  const lines = [
    `**${requests.length} Open Coverage Request${requests.length > 1 ? "s" : ""}**`,
    "",
  ];

  for (const cr of requests) {
    const origUser = cr.original_user as {
      first_name: string;
      last_name: string;
    } | null;
    const shift = cr.original_shift as Record<string, unknown> | null;
    const cls = shift?.class as { name: string } | null;
    lines.push(
      `- **${cr.urgency}** - ${shift?.date} ${shift?.start_time}–${shift?.end_time} (${shift?.shift_role})${cls ? ` ${cls.name}` : ""} - covering for ${origUser?.first_name ?? "?"} ${origUser?.last_name ?? ""} - ${cr.reason}`,
    );
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_coverage_gaps",
    success: true,
    content: lines.join("\n"),
  };
}

async function handleGetAvailableReliefStaff(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const date = (args.date as string) || getTodayDate();

  const d = new Date(date);
  const jsDay = d.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // Get recurring + specific availability
  const [recurringRes, specificRes] = await Promise.all([
    supabase
      .from("staff_availability")
      .select(
        "user_id, is_available, available_from, available_until, user:users!staff_availability_user_id_fkey(first_name, last_name)",
      )
      .eq("is_recurring", true)
      .eq("day_of_week", dayOfWeek),
    supabase
      .from("staff_availability")
      .select(
        "user_id, is_available, available_from, available_until, user:users!staff_availability_user_id_fkey(first_name, last_name)",
      )
      .eq("is_recurring", false)
      .eq("specific_date", date),
  ]);

  // Merge: specific overrides recurring
  const availMap = new Map<
    string,
    {
      name: string;
      available: boolean;
      from: string | null;
      until: string | null;
    }
  >();
  for (const row of (recurringRes.data ?? []) as Array<
    Record<string, unknown>
  >) {
    const user = row.user as { first_name: string; last_name: string } | null;
    availMap.set(row.user_id as string, {
      name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
      available: row.is_available as boolean,
      from: row.available_from as string | null,
      until: row.available_until as string | null,
    });
  }
  for (const row of (specificRes.data ?? []) as Array<
    Record<string, unknown>
  >) {
    const user = row.user as { first_name: string; last_name: string } | null;
    availMap.set(row.user_id as string, {
      name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
      available: row.is_available as boolean,
      from: row.available_from as string | null,
      until: row.available_until as string | null,
    });
  }

  const avail = Array.from(availMap.values()).filter((a) => a.available);
  const unavail = Array.from(availMap.values()).filter((a) => !a.available);

  const lines = [`**Staff availability for ${date}**`, ""];
  if (avail.length > 0) {
    lines.push(`Available (${avail.length}):`);
    for (const a of avail) {
      lines.push(`- ${a.name}${a.from ? ` (${a.from}–${a.until})` : ""}`);
    }
  } else {
    lines.push("No staff have explicitly set themselves as available.");
  }

  if (unavail.length > 0) {
    lines.push(
      "",
      `Unavailable (${unavail.length}): ${unavail.map((a) => a.name).join(", ")}`,
    );
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_available_relief_staff",
    success: true,
    content: lines.join("\n"),
  };
}

// ── Module Q: Individual Learning Plans ────────────────────────

async function handleGetStudentLearningPlan(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) || "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_learning_plan",
      success: false,
      content: "Please provide a student name to look up.",
    };
  }

  // Find student by name
  const q = studentName.trim().toLowerCase();
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, preferred_name")
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,preferred_name.ilike.%${q}%`,
    )
    .limit(5);

  if (!students || students.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_learning_plan",
      success: true,
      content: `No students found matching "${studentName}".`,
    };
  }

  // Get the most likely match (first result)
  const student = students[0];
  const studentFullName = `${student.first_name} ${student.last_name}`;

  // Get active ILP for this student
  const { data: plans } = await supabase
    .from("individual_learning_plans")
    .select(
      `
      id, plan_title, plan_status, support_categories, funding_source,
      start_date, review_due_date, child_strengths, child_interests, family_goals,
      parent_consent_given
    `,
    )
    .eq("student_id", student.id)
    .in("plan_status", ["active", "in_review", "draft"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (!plans || plans.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_learning_plan",
      success: true,
      content: `No active learning plan found for ${studentFullName}.`,
    };
  }

  const plan = plans[0] as Record<string, unknown>;

  // Get goals for this plan
  const { data: goals } = await supabase
    .from("ilp_goals")
    .select(
      "id, goal_title, goal_status, priority, developmental_domain, success_criteria",
    )
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });

  // Get collaborators
  const { data: collaborators } = await supabase
    .from("ilp_collaborators")
    .select("name, role, organisation")
    .eq("plan_id", plan.id);

  const lines = [`**Learning Plan for ${studentFullName}**`, ""];
  lines.push(`Plan: ${plan.plan_title}`);
  lines.push(`Status: ${(plan.plan_status as string).replace("_", " ")}`);
  lines.push(`Start: ${plan.start_date}`);
  if (plan.review_due_date) lines.push(`Review due: ${plan.review_due_date}`);
  if (plan.funding_source)
    lines.push(
      `Funding: ${(plan.funding_source as string).replace(/_/g, " ")}`,
    );
  const cats = plan.support_categories as string[] | null;
  if (cats && cats.length > 0)
    lines.push(
      `Support categories: ${cats.map((c) => c.replace(/_/g, " ")).join(", ")}`,
    );
  lines.push(
    `Consent: ${plan.parent_consent_given ? "Yes" : "Not yet recorded"}`,
  );

  if (plan.child_strengths)
    lines.push("", `**Strengths:** ${plan.child_strengths}`);
  if (plan.child_interests)
    lines.push(`**Interests:** ${plan.child_interests}`);
  if (plan.family_goals) lines.push(`**Family goals:** ${plan.family_goals}`);

  if (goals && goals.length > 0) {
    lines.push("", `**Goals (${goals.length}):**`);
    for (const g of goals as Array<Record<string, unknown>>) {
      const status = (g.goal_status as string).replace("_", " ");
      const priority = g.priority as string;
      lines.push(
        `- [${status}] (${priority}) ${g.goal_title}${g.success_criteria ? ` - Success: ${g.success_criteria}` : ""}`,
      );
    }
  } else {
    lines.push("", "No goals added yet.");
  }

  if (collaborators && collaborators.length > 0) {
    lines.push("", `**Collaborators (${collaborators.length}):**`);
    for (const c of collaborators as Array<Record<string, unknown>>) {
      const org = c.organisation ? ` (${c.organisation})` : "";
      lines.push(
        `- ${c.name} - ${(c.role as string).replace(/_/g, " ")}${org}`,
      );
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_student_learning_plan",
    success: true,
    content: lines.join("\n"),
  };
}

async function handleGetIlpReviewSchedule(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();

  // Get all active plans with review due dates
  const { data: plans } = await supabase
    .from("individual_learning_plans")
    .select(
      `
      id, plan_title, review_due_date,
      student:students!individual_learning_plans_student_id_fkey(first_name, last_name)
    `,
    )
    .in("plan_status", ["active", "in_review"])
    .not("review_due_date", "is", null)
    .order("review_due_date", { ascending: true });

  if (!plans || plans.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_ilp_review_schedule",
      success: true,
      content: "No active learning plans with review dates found.",
    };
  }

  const overdue: string[] = [];
  const upcoming: string[] = [];
  const later: string[] = [];

  for (const p of plans as Array<Record<string, unknown>>) {
    const student = Array.isArray(p.student) ? p.student[0] : p.student;
    const name = student
      ? `${(student as Record<string, string>).first_name} ${(student as Record<string, string>).last_name}`
      : "Unknown";
    const due = p.review_due_date as string;
    const line = `- ${name}: "${p.plan_title}" - due ${due}`;

    if (due < today) {
      overdue.push(line);
    } else {
      const dueDate = new Date(due);
      const todayDate = new Date(today);
      const diffDays = Math.ceil(
        (dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 30) {
        upcoming.push(line);
      } else {
        later.push(line);
      }
    }
  }

  const lines = ["**ILP Review Schedule**", ""];

  if (overdue.length > 0) {
    lines.push(`**OVERDUE (${overdue.length}):**`);
    lines.push(...overdue);
    lines.push("");
  }

  if (upcoming.length > 0) {
    lines.push(`**Due within 30 days (${upcoming.length}):**`);
    lines.push(...upcoming);
    lines.push("");
  }

  if (later.length > 0) {
    lines.push(`**Later (${later.length}):**`);
    lines.push(...later);
  }

  if (overdue.length === 0 && upcoming.length === 0 && later.length === 0) {
    lines.push("No reviews scheduled.");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_ilp_review_schedule",
    success: true,
    content: lines.join("\n"),
  };
}

async function handleGetTransitionStatementProgress(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const year = (args.year as number) || new Date().getFullYear();

  const { data: statements } = await supabase
    .from("transition_statements")
    .select(
      `
      id, statement_status, statement_year, school_name,
      student:students!transition_statements_student_id_fkey(first_name, last_name)
    `,
    )
    .eq("statement_year", year)
    .order("statement_status", { ascending: true });

  if (!statements || statements.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_transition_statement_progress",
      success: true,
      content: `No transition statements found for ${year}.`,
    };
  }

  // Group by status
  const byStatus: Record<string, string[]> = {};
  for (const s of statements as Array<Record<string, unknown>>) {
    const student = Array.isArray(s.student) ? s.student[0] : s.student;
    const name = student
      ? `${(student as Record<string, string>).first_name} ${(student as Record<string, string>).last_name}`
      : "Unknown";
    const status = (s.statement_status as string).replace(/_/g, " ");
    const school = s.school_name ? ` → ${s.school_name}` : "";
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(`- ${name}${school}`);
  }

  const lines = [
    `**Transition Statements for ${year}** (${statements.length} total)`,
    "",
  ];

  for (const [status, items] of Object.entries(byStatus)) {
    lines.push(
      `**${status.charAt(0).toUpperCase() + status.slice(1)} (${items.length}):**`,
    );
    lines.push(...items);
    lines.push("");
  }

  const completed = (statements as Array<Record<string, unknown>>).filter(
    (s) =>
      s.statement_status === "completed" ||
      s.statement_status === "shared_with_school",
  ).length;
  lines.push(
    `Progress: ${completed}/${statements.length} completed or shared with school.`,
  );

  return {
    tool_call_id: toolCallId,
    tool_name: "get_transition_statement_progress",
    success: true,
    content: lines.join("\n"),
  };
}

// ============================================================
// Module P: Wellbeing & Pastoral Care Handlers
// ============================================================

async function handleGetStudentWellbeingSummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const name = args.name as string;
  if (!name) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_wellbeing_summary",
      success: false,
      content: "Student name is required.",
    };
  }

  // Find matching students
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
    .is("deleted_at", null)
    .limit(5);

  if (!students || students.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_wellbeing_summary",
      success: true,
      content: `No student found matching "${name}".`,
    };
  }

  const student = students[0] as {
    id: string;
    first_name: string;
    last_name: string;
  };
  const displayName = `${student.first_name} ${student.last_name}`;

  const today = getTodayDate();

  const [flagsRes, referralsRes, checkInsRes] = await Promise.all([
    supabase
      .from("wellbeing_flags")
      .select("id, concern_category, severity, status, title, created_at")
      .eq("student_id", student.id)
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null)
      .order("severity", { ascending: false }),
    supabase
      .from("student_referrals")
      .select(
        "id, referral_type, specialty, status, organisation_name, created_at",
      )
      .eq("student_id", student.id)
      .in("status", ["pending", "accepted", "in_progress"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("wellbeing_check_ins")
      .select("id, scheduled_date, status, check_in_areas")
      .eq("student_id", student.id)
      .in("status", ["scheduled", "rescheduled"])
      .is("deleted_at", null)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(3),
  ]);

  const flags = (flagsRes.data ?? []) as Array<Record<string, unknown>>;
  const referrals = (referralsRes.data ?? []) as Array<Record<string, unknown>>;
  const checkIns = (checkInsRes.data ?? []) as Array<Record<string, unknown>>;

  const lines = [`**Wellbeing Summary: ${displayName}**`, ""];

  if (flags.length > 0) {
    lines.push(`**Open Flags (${flags.length}):**`);
    for (const f of flags) {
      const severity = (f.severity as string).toUpperCase();
      lines.push(
        `- [${severity}] ${f.title} - ${(f.status as string).replace(/_/g, " ")}`,
      );
    }
    lines.push("");
  } else {
    lines.push("**Open Flags:** None");
    lines.push("");
  }

  if (referrals.length > 0) {
    lines.push(`**Active Referrals (${referrals.length}):**`);
    for (const r of referrals) {
      const specialty = (r.specialty as string).replace(/_/g, " ");
      const org = r.organisation_name ? ` (${r.organisation_name})` : "";
      lines.push(
        `- ${specialty}${org} - ${(r.status as string).replace(/_/g, " ")}`,
      );
    }
    lines.push("");
  } else {
    lines.push("**Active Referrals:** None");
    lines.push("");
  }

  if (checkIns.length > 0) {
    lines.push(`**Upcoming Check-ins (${checkIns.length}):**`);
    for (const c of checkIns) {
      const areas = Array.isArray(c.check_in_areas)
        ? (c.check_in_areas as string[]).join(", ")
        : "General";
      lines.push(`- ${c.scheduled_date} - ${areas}`);
    }
  } else {
    lines.push("**Upcoming Check-ins:** None scheduled");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_student_wellbeing_summary",
    success: true,
    content: lines.join("\n"),
  };
}

async function handleGetWellbeingDashboard(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();
  const sevenDays = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .split("T")[0];

  const [flagsRes, referralsRes, checkInsRes, pastoralRes] = await Promise.all([
    supabase
      .from("wellbeing_flags")
      .select("id, severity, status")
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null),
    supabase
      .from("student_referrals")
      .select("id, status", { count: "exact" })
      .in("status", ["pending", "accepted", "in_progress"])
      .is("deleted_at", null),
    supabase
      .from("wellbeing_check_ins")
      .select("id, scheduled_date, status")
      .in("status", ["scheduled", "rescheduled"])
      .is("deleted_at", null)
      .gte("scheduled_date", today)
      .lte("scheduled_date", sevenDays),
    supabase
      .from("pastoral_care_records")
      .select("id, parent_contacted")
      .eq("parent_contacted", false)
      .is("deleted_at", null)
      .limit(20),
  ]);

  const flags = (flagsRes.data ?? []) as Array<Record<string, string>>;
  const referralCount = referralsRes.count ?? 0;
  const checkIns = (checkInsRes.data ?? []) as Array<Record<string, string>>;
  const uncontacted = (pastoralRes.data ?? []).length;

  // Group flags by severity
  const bySeverity: Record<string, number> = {};
  for (const f of flags) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }

  const lines = ["**Wellbeing Dashboard**", ""];

  lines.push(`**Open Flags: ${flags.length}**`);
  const severityOrder = ["critical", "high", "medium", "low"];
  for (const sev of severityOrder) {
    if (bySeverity[sev]) {
      lines.push(
        `- ${sev.charAt(0).toUpperCase() + sev.slice(1)}: ${bySeverity[sev]}`,
      );
    }
  }
  lines.push("");

  lines.push(`**Active Referrals:** ${referralCount}`);
  lines.push(`**Check-ins due this week:** ${checkIns.length}`);
  lines.push(`**Pastoral records needing parent contact:** ${uncontacted}`);

  return {
    tool_call_id: toolCallId,
    tool_name: "get_wellbeing_dashboard",
    success: true,
    content: lines.join("\n"),
  };
}

// ============================================================
// Normalization Indicators
// ============================================================

async function handleGetNormalizationSummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const studentName = ((args.student_name as string) ?? "").trim();

  if (!studentName) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_normalization_summary",
      success: false,
      content: "Please provide a student name.",
    };
  }

  // Resolve student by name
  const nameParts = studentName.split(/\s+/);
  let studentQuery = supabase
    .from("students")
    .select("id, first_name, last_name, preferred_name")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (nameParts.length >= 2) {
    studentQuery = studentQuery
      .ilike("first_name", `%${nameParts[0]}%`)
      .ilike("last_name", `%${nameParts[nameParts.length - 1]}%`);
  } else {
    studentQuery = studentQuery.or(
      `first_name.ilike.%${studentName}%,last_name.ilike.%${studentName}%,preferred_name.ilike.%${studentName}%`,
    );
  }

  const { data: students } = await studentQuery.limit(1);
  const student = students?.[0];
  if (!student) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_normalization_summary",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }

  // Get observations (most recent 10)
  const { data: observations } = await supabase
    .from("normalization_observations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("student_id", student.id)
    .is("deleted_at", null)
    .order("observation_date", { ascending: false })
    .limit(10);

  // Get active goals
  const { data: goals } = await supabase
    .from("normalization_goals")
    .select("indicator, current_rating, target_rating, strategy, status")
    .eq("tenant_id", tenantId)
    .eq("student_id", student.id)
    .eq("status", "active")
    .is("deleted_at", null);

  const obs = (observations ?? []) as Array<Record<string, unknown>>;
  const latest = obs[0];

  const displayName = student.preferred_name || student.first_name;
  const lines = [
    `**Normalization Summary for ${displayName} ${student.last_name}**`,
    "",
  ];

  if (!latest) {
    lines.push("No normalization observations recorded yet.");
    return {
      tool_call_id: toolCallId,
      tool_name: "get_normalization_summary",
      success: true,
      content: lines.join("\n"),
    };
  }

  // Latest ratings
  const indicators = [
    "concentration",
    "independence",
    "order",
    "coordination",
    "social_harmony",
  ] as const;
  const ratingLabels: Record<number, string> = {
    1: "Rarely",
    2: "Sometimes",
    3: "Often",
    4: "Usually",
    5: "Consistently",
  };

  lines.push(`**Latest Observation** (${latest.observation_date})`, "");
  let sum = 0;
  for (const ind of indicators) {
    const rating = latest[`${ind}_rating`] as number;
    sum += rating;
    const label = ind.replace(/_/g, " ");
    const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
    lines.push(`- **${capitalized}:** ${rating}/5 (${ratingLabels[rating]})`);
  }
  const avg = sum / 5;
  let level = "Emerging";
  if (avg >= 4.5) level = "Flourishing";
  else if (avg >= 3.5) level = "Normalized";
  else if (avg >= 2.0) level = "Developing";

  lines.push("");
  lines.push(`**Overall Level:** ${level} (${avg.toFixed(1)}/5)`);
  lines.push(
    `**Work Cycle Engagement:** ${(latest.work_cycle_engagement as string).replace(/_/g, " ")}`,
  );
  lines.push(
    `**Self-Direction:** ${(latest.self_direction as string).replace(/_/g, " ")}`,
  );
  lines.push(
    `**Joyful Engagement:** ${latest.joyful_engagement ? "Yes" : "No"}`,
  );

  if (latest.concentration_duration_minutes) {
    lines.push(
      `**Concentration Duration:** ${latest.concentration_duration_minutes} min`,
    );
  }

  // Trend
  if (obs.length >= 3) {
    const recentAvg =
      obs.slice(0, 3).reduce((s, o) => {
        let t = 0;
        for (const ind of indicators) t += o[`${ind}_rating`] as number;
        return s + t / 5;
      }, 0) / 3;
    const previousObs = obs.slice(3, 6);
    if (previousObs.length >= 2) {
      const prevAvg =
        previousObs.reduce((s, o) => {
          let t = 0;
          for (const ind of indicators) t += o[`${ind}_rating`] as number;
          return s + t / 5;
        }, 0) / previousObs.length;
      const diff = recentAvg - prevAvg;
      const trend =
        diff > 0.3 ? "↗ Improving" : diff < -0.3 ? "↘ Declining" : "→ Stable";
      lines.push(`**Trend:** ${trend}`);
    }
  }

  lines.push(`**Total Observations:** ${obs.length}`);

  // Active goals
  const activeGoals = (goals ?? []) as Array<Record<string, unknown>>;
  if (activeGoals.length > 0) {
    lines.push("", `**Active Goals (${activeGoals.length}):**`);
    for (const g of activeGoals) {
      const ind = (g.indicator as string).replace(/_/g, " ");
      lines.push(
        `- ${ind.charAt(0).toUpperCase() + ind.slice(1)}: ${g.current_rating}→${g.target_rating} - ${g.strategy}`,
      );
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_normalization_summary",
    success: true,
    content: lines.join("\n"),
  };
}

// ── Prepared Environment Planner ────────────────────────────────────────────

async function handleGetEnvironmentPlanSummary(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const today = new Date().toISOString().split("T")[0];

  // Fetch active plans with location info
  const { data: plans } = await supabase
    .from("environment_plans")
    .select(
      "id, name, status, theme, effective_from, effective_to, location_id",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .in("status", ["active", "draft"])
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch slot counts per plan
  const planIds = (plans ?? []).map(
    (p: Record<string, unknown>) => p.id as string,
  );
  let slotCounts: Record<string, number> = {};
  if (planIds.length > 0) {
    const { data: slots } = await supabase
      .from("plan_shelf_slots")
      .select("plan_id")
      .eq("tenant_id", tenantId)
      .in("plan_id", planIds);
    for (const s of (slots ?? []) as Array<Record<string, unknown>>) {
      const pid = s.plan_id as string;
      slotCounts[pid] = (slotCounts[pid] ?? 0) + 1;
    }
  }

  // Fetch upcoming rotations (next 30 days + overdue)
  const { data: rotations } = await supabase
    .from("rotation_schedules")
    .select("id, title, theme_type, scheduled_date, status")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .in("status", ["upcoming", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .limit(10);

  const lines: string[] = ["**Prepared Environment Planner Summary**", ""];

  // Plans section
  const activePlans = ((plans ?? []) as Array<Record<string, unknown>>).filter(
    (p) => p.status === "active",
  );
  const draftPlans = ((plans ?? []) as Array<Record<string, unknown>>).filter(
    (p) => p.status === "draft",
  );

  lines.push(
    `**Plans:** ${activePlans.length} active, ${draftPlans.length} draft`,
  );
  if (activePlans.length > 0) {
    lines.push("");
    lines.push("**Active Plans:**");
    for (const p of activePlans) {
      const slots = slotCounts[p.id as string] ?? 0;
      const theme = p.theme ? ` - ${p.theme}` : "";
      lines.push(`- ${p.name}${theme} (${slots} slots)`);
    }
  }
  if (draftPlans.length > 0) {
    lines.push("");
    lines.push("**Draft Plans:**");
    for (const p of draftPlans) {
      const slots = slotCounts[p.id as string] ?? 0;
      lines.push(`- ${p.name} (${slots} slots)`);
    }
  }

  // Rotations section
  const rotationList = (rotations ?? []) as Array<Record<string, unknown>>;
  const overdueRotations = rotationList.filter(
    (r) => r.status === "upcoming" && (r.scheduled_date as string) < today,
  );
  const upcomingRotations = rotationList.filter(
    (r) => r.status === "upcoming" && (r.scheduled_date as string) >= today,
  );
  const inProgressRotations = rotationList.filter(
    (r) => r.status === "in_progress",
  );

  lines.push("");
  lines.push(
    `**Rotations:** ${inProgressRotations.length} in progress, ${upcomingRotations.length} upcoming, ${overdueRotations.length} overdue`,
  );

  if (overdueRotations.length > 0) {
    lines.push("");
    lines.push("**Overdue Rotations:**");
    for (const r of overdueRotations) {
      lines.push(`- ⚠️ ${r.title} (was due ${r.scheduled_date})`);
    }
  }

  if (inProgressRotations.length > 0) {
    lines.push("");
    lines.push("**In Progress:**");
    for (const r of inProgressRotations) {
      lines.push(`- 🔄 ${r.title}`);
    }
  }

  if (upcomingRotations.length > 0) {
    lines.push("");
    lines.push("**Upcoming Rotations:**");
    for (const r of upcomingRotations) {
      lines.push(`- 📅 ${r.title} - ${r.scheduled_date}`);
    }
  }

  if (rotationList.length === 0) {
    lines.push("");
    lines.push("No upcoming rotations scheduled.");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_environment_plan_summary",
    success: true,
    content: lines.join("\n"),
  };
}

// ── Accreditation Status ──────────────────────────────────────

async function handleGetAccreditationStatus(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const bodyCodeFilter = args.body_code as string | undefined;

  const BODIES = ["ami", "ams", "msaa"] as const;
  const BODY_NAMES: Record<string, string> = {
    ami: "AMI (Association Montessori Internationale)",
    ams: "AMS (American Montessori Society)",
    msaa: "MSAA (Montessori Schools Association of Australia)",
  };

  let query = supabase
    .from("accreditation_cycles")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (bodyCodeFilter) query = query.eq("body_code", bodyCodeFilter);

  const { data: cycles, error } = await query;
  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_accreditation_status",
      success: false,
      content: error.message,
    };
  }

  if (!cycles || cycles.length === 0) {
    const bodyLabel = bodyCodeFilter
      ? (BODY_NAMES[bodyCodeFilter] ?? bodyCodeFilter.toUpperCase())
      : "any accrediting body";
    return {
      tool_call_id: toolCallId,
      tool_name: "get_accreditation_status",
      success: true,
      content: `No accreditation cycles found for ${bodyLabel}. Start a new cycle from the Accreditation Checklist page.`,
    };
  }

  // For each cycle, get assessment counts
  const lines: string[] = ["**Montessori Accreditation Status**", ""];

  const bodiesToReport = bodyCodeFilter ? [bodyCodeFilter] : [...BODIES];

  for (const body of bodiesToReport) {
    const bodyCycles = (cycles as Array<Record<string, unknown>>).filter(
      (c) => c.body_code === body,
    );
    if (bodyCycles.length === 0) continue;

    lines.push(`**${BODY_NAMES[body] ?? body.toUpperCase()}**`);

    const activeCycle = bodyCycles.find((c) =>
      ["self_study", "submitted", "under_review", "accredited"].includes(
        c.status as string,
      ),
    );

    if (activeCycle) {
      lines.push(
        `Status: ${(activeCycle.status as string).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
      );
      lines.push(`Cycle: ${activeCycle.cycle_label}`);

      if (activeCycle.self_study_start) {
        lines.push(
          `Self-study: ${activeCycle.self_study_start} → ${activeCycle.self_study_end ?? "ongoing"}`,
        );
      }
      if (activeCycle.accreditation_valid_to) {
        lines.push(
          `Accreditation valid to: ${activeCycle.accreditation_valid_to}`,
        );
      }

      // Fetch assessment progress
      const { data: assessments } = await supabase
        .from("accreditation_assessments")
        .select("rating")
        .eq("tenant_id", tenantId)
        .eq("cycle_id", activeCycle.id as string);

      const rows = (assessments ?? []) as Array<{ rating: string }>;
      const total = rows.length;
      const met = rows.filter(
        (r) => r.rating === "met" || r.rating === "exceeds",
      ).length;
      const partial = rows.filter((r) => r.rating === "partially_met").length;
      const notMet = rows.filter((r) => r.rating === "not_met").length;
      const notStarted = rows.filter((r) => r.rating === "not_started").length;
      const pct = total > 0 ? Math.round((met / total) * 100) : 0;

      if (total > 0) {
        lines.push(`Progress: ${met}/${total} criteria met (${pct}%)`);
        if (partial > 0) lines.push(`- ${partial} partially met`);
        if (notMet > 0) lines.push(`- ${notMet} not yet met`);
        if (notStarted > 0) lines.push(`- ${notStarted} not yet assessed`);
      }
    } else if (bodyCycles.length > 0) {
      const latest = bodyCycles[0] as Record<string, unknown>;
      lines.push(
        `Most recent cycle: ${latest.cycle_label} (${(latest.status as string).replace(/_/g, " ")})`,
      );
    }

    lines.push("");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_accreditation_status",
    success: true,
    content: lines.join("\n").trim(),
  };
}

// ============================================================
// get_cosmic_education_plan
// ============================================================

async function handleGetCosmicEducationPlan(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  const lessonKeyFilter =
    typeof args.lesson_key === "string" ? args.lesson_key : null;
  const statusFilter = typeof args.status === "string" ? args.status : null;

  // Fetch units with great lesson info
  let query = supabase
    .from("cosmic_units")
    .select(
      `
      id,
      title,
      status,
      planned_start,
      planned_end,
      age_range,
      great_lesson_id,
      cosmic_great_lessons!inner (
        lesson_key,
        title
      )
    `,
    )
    .is("deleted_at", null)
    .order("planned_start", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: units, error } = await query;

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_cosmic_education_plan",
      success: false,
      content: `Error fetching cosmic units: ${error.message}`,
    };
  }

  const allUnits = (units ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    planned_start: string | null;
    planned_end: string | null;
    age_range: string;
    great_lesson_id: string;
    cosmic_great_lessons:
      | { lesson_key: string; title: string }
      | Array<{ lesson_key: string; title: string }>;
  }>;

  // Filter by lesson_key after join if requested
  const filtered = lessonKeyFilter
    ? allUnits.filter((u) => {
        const gl = Array.isArray(u.cosmic_great_lessons)
          ? u.cosmic_great_lessons[0]
          : u.cosmic_great_lessons;
        return gl?.lesson_key === lessonKeyFilter;
      })
    : allUnits;

  if (filtered.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_cosmic_education_plan",
      success: true,
      content: "No cosmic education units found matching the filters.",
    };
  }

  // Fetch participant counts per unit
  const unitIds = filtered.map((u) => u.id);
  const { data: participants } = await supabase
    .from("cosmic_unit_participants")
    .select("unit_id")
    .in("unit_id", unitIds);

  const participantCounts: Record<string, number> = {};
  for (const p of participants ?? []) {
    participantCounts[p.unit_id] = (participantCounts[p.unit_id] ?? 0) + 1;
  }

  // Fetch study counts per unit
  const { data: studies } = await supabase
    .from("cosmic_unit_studies")
    .select("unit_id")
    .in("unit_id", unitIds)
    .is("deleted_at", null);

  const studyCounts: Record<string, number> = {};
  for (const s of studies ?? []) {
    studyCounts[s.unit_id] = (studyCounts[s.unit_id] ?? 0) + 1;
  }

  // Group by status for summary
  const byStatus: Record<string, typeof filtered> = {};
  for (const u of filtered) {
    const s = u.status;
    byStatus[s] = byStatus[s] ?? [];
    byStatus[s].push(u);
  }

  const lines: string[] = [
    `Cosmic Education Units (${filtered.length} total)`,
    "",
  ];

  // Summary counts
  const statuses = ["active", "draft", "completed", "archived"];
  for (const s of statuses) {
    const count = (byStatus[s] ?? []).length;
    if (count > 0)
      lines.push(`${s.charAt(0).toUpperCase() + s.slice(1)}: ${count}`);
  }
  lines.push("");

  // List units grouped by Great Lesson
  const byLesson: Record<string, typeof filtered> = {};
  for (const u of filtered) {
    const gl = Array.isArray(u.cosmic_great_lessons)
      ? u.cosmic_great_lessons[0]
      : u.cosmic_great_lessons;
    const lessonTitle = gl?.title ?? "Unknown";
    byLesson[lessonTitle] = byLesson[lessonTitle] ?? [];
    byLesson[lessonTitle].push(u);
  }

  for (const [lessonTitle, lessonUnits] of Object.entries(byLesson)) {
    lines.push(`${lessonTitle}:`);
    for (const u of lessonUnits) {
      const pCount = participantCounts[u.id] ?? 0;
      const sCount = studyCounts[u.id] ?? 0;
      const dateRange = u.planned_start
        ? `${u.planned_start}${u.planned_end ? ` – ${u.planned_end}` : ""}`
        : "No dates set";
      lines.push(`  • [${u.status.toUpperCase()}] ${u.title}`);
      lines.push(`    ${pCount} students · ${sCount} studies · ${dateRange}`);
    }
    lines.push("");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_cosmic_education_plan",
    success: true,
    content: lines.join("\n").trim(),
  };
}

// ============================================================
// Grant Tracking
// ============================================================

async function handleGetGrantTrackingSummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const grantNameFilter =
    typeof args.grant_name === "string" ? args.grant_name.toLowerCase() : null;

  // Fetch all grants for this tenant
  const { data: grants, error } = await supabase
    .from("grants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_grant_tracking_summary",
      success: false,
      content: `Error fetching grants: ${error.message}`,
    };
  }

  const allGrants = (grants ?? []) as Array<{
    id: string;
    name: string;
    reference_number: string | null;
    funding_body: string;
    amount_cents: number;
    spent_cents: number;
    start_date: string;
    end_date: string;
    acquittal_due_date: string | null;
    status: string;
    category: string;
  }>;

  // Filter by name if provided
  const filtered = grantNameFilter
    ? allGrants.filter((g) => g.name.toLowerCase().includes(grantNameFilter))
    : allGrants;

  if (filtered.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_grant_tracking_summary",
      success: true,
      content: grantNameFilter
        ? `No grants found matching "${args.grant_name}".`
        : "No grants have been created yet.",
    };
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(cents / 100);

  // If single grant, show detail
  if (grantNameFilter && filtered.length === 1) {
    const g = filtered[0];
    const pct =
      g.amount_cents > 0
        ? Math.round((g.spent_cents / g.amount_cents) * 100)
        : 0;
    const remaining = Math.max(0, g.amount_cents - g.spent_cents);

    // Fetch milestones
    const { data: milestones } = await supabase
      .from("grant_milestones")
      .select("title, due_date, status")
      .eq("grant_id", g.id)
      .order("due_date");

    // Fetch recent expenditures
    const { data: expenditures } = await supabase
      .from("grant_expenditures")
      .select("description, amount_cents, date")
      .eq("grant_id", g.id)
      .order("date", { ascending: false })
      .limit(5);

    const lines: string[] = [
      `Grant: ${g.name}`,
      `Status: ${g.status.toUpperCase()}`,
      `Funding Body: ${g.funding_body}`,
      g.reference_number ? `Reference: ${g.reference_number}` : "",
      `Amount: ${fmt(g.amount_cents)}`,
      `Spent: ${fmt(g.spent_cents)} (${pct}%)`,
      `Remaining: ${fmt(remaining)}`,
      `Period: ${g.start_date} – ${g.end_date}`,
      g.acquittal_due_date ? `Acquittal Due: ${g.acquittal_due_date}` : "",
    ].filter(Boolean);

    if ((milestones ?? []).length > 0) {
      lines.push("", "Milestones:");
      for (const m of milestones ?? []) {
        lines.push(
          `  • [${m.status.toUpperCase()}] ${m.title} (due ${m.due_date})`,
        );
      }
    }

    if ((expenditures ?? []).length > 0) {
      lines.push("", "Recent Expenditures:");
      for (const e of expenditures ?? []) {
        lines.push(`  • ${e.date}: ${e.description} - ${fmt(e.amount_cents)}`);
      }
    }

    return {
      tool_call_id: toolCallId,
      tool_name: "get_grant_tracking_summary",
      success: true,
      content: lines.join("\n"),
    };
  }

  // Summary view
  const active = filtered.filter((g) => g.status === "active");
  const totalAwarded = filtered
    .filter((g) => ["approved", "active", "acquitted"].includes(g.status))
    .reduce((sum, g) => sum + g.amount_cents, 0);
  const totalSpent = filtered.reduce((sum, g) => sum + g.spent_cents, 0);

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86_400_000);
  const today = now.toISOString().slice(0, 10);

  const upcomingAcquittals = filtered.filter(
    (g) =>
      g.status === "active" &&
      g.acquittal_due_date &&
      g.acquittal_due_date >= today &&
      g.acquittal_due_date <= in90Days.toISOString().slice(0, 10),
  );

  // Fetch overdue milestones
  const grantIds = filtered.map((g) => g.id);
  const { data: overdueMilestones } = await supabase
    .from("grant_milestones")
    .select("title, due_date, grant_id")
    .in("grant_id", grantIds)
    .in("status", ["pending", "in_progress"])
    .lt("due_date", today)
    .limit(10);

  const grantNameMap = new Map(filtered.map((g) => [g.id, g.name]));

  const lines: string[] = [
    `Grant Tracking Summary (${filtered.length} grants)`,
    "",
    `Active Grants: ${active.length}`,
    `Total Awarded: ${fmt(totalAwarded)}`,
    `Total Spent: ${fmt(totalSpent)}`,
    totalAwarded > 0
      ? `Utilisation: ${Math.round((totalSpent / totalAwarded) * 100)}%`
      : "",
    "",
  ].filter(Boolean);

  if (upcomingAcquittals.length > 0) {
    lines.push("Upcoming Acquittals (next 90 days):");
    for (const g of upcomingAcquittals) {
      lines.push(
        `  • ${g.name} - due ${g.acquittal_due_date} (${fmt(g.amount_cents)})`,
      );
    }
    lines.push("");
  }

  if ((overdueMilestones ?? []).length > 0) {
    lines.push("Overdue Milestones:");
    for (const m of overdueMilestones ?? []) {
      const gName = grantNameMap.get(m.grant_id) ?? "Unknown";
      lines.push(`  • ${gName}: ${m.title} (due ${m.due_date})`);
    }
    lines.push("");
  }

  // List grants by status
  const byStatus: Record<string, typeof filtered> = {};
  for (const g of filtered) {
    byStatus[g.status] = byStatus[g.status] ?? [];
    byStatus[g.status].push(g);
  }

  for (const [status, statusGrants] of Object.entries(byStatus)) {
    lines.push(
      `${status.charAt(0).toUpperCase() + status.slice(1)} (${statusGrants.length}):`,
    );
    for (const g of statusGrants) {
      const pct =
        g.amount_cents > 0
          ? Math.round((g.spent_cents / g.amount_cents) * 100)
          : 0;
      lines.push(`  • ${g.name} - ${fmt(g.amount_cents)} (${pct}% spent)`);
    }
    lines.push("");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_grant_tracking_summary",
    success: true,
    content: lines.join("\n").trim(),
  };
}

// ── Newsletter Summary ──────────────────────────────────────────
async function handleGetNewsletterSummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const statusFilter = (args.status as string) ?? "";

  // Build base query
  let query = supabase
    .from("newsletters")
    .select(
      "id, title, status, audience, sent_at, scheduled_for, recipient_count, read_count, created_at, author:created_by_user_id(first_name, last_name)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const [nlRes, templateRes, statsRes] = await Promise.all([
    query,
    supabase
      .from("newsletter_templates")
      .select("id", { count: "exact" })
      .is("deleted_at", null),
    supabase
      .from("newsletters")
      .select("status, recipient_count, read_count")
      .is("deleted_at", null),
  ]);

  const newsletters = (nlRes.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    audience: string;
    sent_at: string | null;
    scheduled_for: string | null;
    recipient_count: number;
    read_count: number;
    created_at: string;
    author: Array<{ first_name: string; last_name: string }> | null;
  }>;

  const allStats = (statsRes.data ?? []) as Array<{
    status: string;
    recipient_count: number;
    read_count: number;
  }>;

  const templateCount = templateRes.count ?? 0;

  // Aggregate stats
  const drafts = allStats.filter((n) => n.status === "draft").length;
  const scheduled = allStats.filter((n) => n.status === "scheduled").length;
  const sent = allStats.filter((n) => n.status === "sent");
  const totalRecipients = sent.reduce((s, n) => s + n.recipient_count, 0);
  const totalReads = sent.reduce((s, n) => s + n.read_count, 0);
  const avgOpenRate =
    totalRecipients > 0 ? Math.round((totalReads / totalRecipients) * 100) : 0;

  const lines: string[] = [
    statusFilter
      ? `Newsletter Summary (filtered: ${statusFilter})`
      : "Newsletter Summary",
    "",
    `Total Sent: ${sent.length}`,
    `Drafts: ${drafts}`,
    `Scheduled: ${scheduled}`,
    `Templates Available: ${templateCount}`,
    totalRecipients > 0
      ? `Overall Open Rate: ${avgOpenRate}% (${totalReads}/${totalRecipients})`
      : "",
    "",
  ].filter(Boolean);

  if (newsletters.length > 0) {
    lines.push(
      statusFilter ? `Recent (${statusFilter}):` : "Recent Newsletters:",
    );
    for (const nl of newsletters) {
      const author =
        Array.isArray(nl.author) && nl.author[0]
          ? ` by ${nl.author[0].first_name} ${nl.author[0].last_name}`
          : "";
      const date = nl.sent_at
        ? `sent ${new Date(nl.sent_at).toLocaleDateString("en-AU")}`
        : nl.scheduled_for
          ? `scheduled ${new Date(nl.scheduled_for).toLocaleDateString("en-AU")}`
          : "draft";
      const openRate =
        nl.status === "sent" && nl.recipient_count > 0
          ? ` - ${Math.round((nl.read_count / nl.recipient_count) * 100)}% opened`
          : "";
      lines.push(`  • ${nl.title} [${date}]${author}${openRate}`);
    }
  } else {
    lines.push("No newsletters found.");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_newsletter_summary",
    success: true,
    content: lines.join("\n").trim(),
  };
}
