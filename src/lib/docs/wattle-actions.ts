// src/lib/docs/wattle-actions.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Action Registry
// ============================================================
// The single source of truth for every action Wattle can suggest.
// Each entry maps a unique ID to a route, permission gate, and
// description. The system prompt builder reads this to inject
// only the actions the current user can access. The frontend
// reads it to resolve action clicks to navigation.
//
// WHY a flat array: The primary consumer is a filter + group
// operation for the system prompt. A flat array with .filter()
// is the simplest shape. Lookup-by-ID is a one-liner on top.
//
// WHY OR logic for permissions: Matches the sidebar nav pattern
// in layout.tsx - observations are visible if the user has
// CREATE_OBSERVATION OR VIEW_ALL_OBSERVATIONS.
//
// ADDING A NEW ACTION: Add one object to WATTLE_ACTION_REGISTRY.
// That's it - the prompt builder, permission filter, and frontend
// renderer all pick it up automatically.
// ============================================================

import { Permissions } from "@/lib/constants/permissions";
import type {
  WattleAction,
  WattleActionCategory,
  WattleActionSuggestion,
} from "@/types/ask-wattle";

// ============================================================
// The Registry
// ============================================================

export const WATTLE_ACTION_REGISTRY: WattleAction[] = [
  // ── Navigation: General ────────────────────────────────────
  {
    id: "nav_dashboard",
    label: "Go to Dashboard",
    description: "Navigate to the main dashboard overview",
    type: "navigate",
    route: "/dashboard",
    requiredPermissions: [],
    category: "general",
  },
  {
    id: "nav_settings",
    label: "Go to Settings",
    description: "Navigate to user settings and display preferences",
    type: "navigate",
    route: "/settings",
    requiredPermissions: [],
    category: "general",
  },

  // ── Navigation: Pedagogy ───────────────────────────────────
  {
    id: "nav_observations",
    label: "Go to Observations",
    description:
      "Navigate to the observations feed to view and manage learning observations",
    type: "navigate",
    route: "/pedagogy/observations",
    requiredPermissions: [
      Permissions.CREATE_OBSERVATION,
      Permissions.VIEW_ALL_OBSERVATIONS,
    ],
    category: "pedagogy",
  },
  {
    id: "nav_curriculum",
    label: "Go to Curriculum",
    description:
      "Navigate to the curriculum browser to explore frameworks and outcomes",
    type: "navigate",
    route: "/pedagogy/curriculum",
    requiredPermissions: [Permissions.MANAGE_CURRICULUM],
    category: "pedagogy",
  },
  {
    id: "nav_mastery",
    label: "Go to Mastery Tracking",
    description:
      "Navigate to mastery tracking to view student progress against outcomes",
    type: "navigate",
    route: "/pedagogy/mastery",
    requiredPermissions: [Permissions.MANAGE_MASTERY],
    category: "pedagogy",
  },
  {
    id: "nav_portfolios",
    label: "Go to Portfolios",
    description:
      "Navigate to student portfolios to view learning journey collections",
    type: "navigate",
    route: "/pedagogy/portfolio",
    requiredPermissions: [
      Permissions.CREATE_OBSERVATION,
      Permissions.VIEW_ALL_OBSERVATIONS,
    ],
    category: "pedagogy",
  },
  {
    id: "nav_content_library",
    label: "Go to Content Library",
    description:
      "Navigate to the content library for shared pedagogy resources",
    type: "navigate",
    route: "/pedagogy/content-library",
    requiredPermissions: [Permissions.MANAGE_CURRICULUM],
    category: "pedagogy",
  },

  // ── Navigation: Students ───────────────────────────────────
  {
    id: "nav_students",
    label: "Go to Students",
    description:
      "Navigate to the student information system to view and manage students",
    type: "navigate",
    route: "/students",
    requiredPermissions: [
      Permissions.VIEW_STUDENTS,
      Permissions.MANAGE_STUDENTS,
    ],
    category: "students",
  },
  {
    id: "nav_classes",
    label: "Go to Classes",
    description: "Navigate to class management to view and organise classes",
    type: "navigate",
    route: "/classes",
    requiredPermissions: [
      Permissions.VIEW_STUDENTS,
      Permissions.MANAGE_STUDENTS,
    ],
    category: "students",
  },

  // ── Navigation: Attendance ─────────────────────────────────
  {
    id: "nav_attendance",
    label: "Go to Attendance",
    description: "Navigate to roll call and attendance tracking",
    type: "navigate",
    route: "/attendance",
    requiredPermissions: [Permissions.MANAGE_ATTENDANCE],
    category: "attendance",
  },

  // ── Navigation: Reports ────────────────────────────────────
  {
    id: "nav_reports",
    label: "Go to Reports",
    description: "Navigate to student reports for viewing and generation",
    type: "navigate",
    route: "/reports",
    requiredPermissions: [Permissions.MANAGE_REPORTS],
    category: "pedagogy",
  },

  // ── Navigation: Communications ─────────────────────────────
  {
    id: "nav_comms",
    label: "Go to Communications",
    description:
      "Navigate to the communications hub for messages and announcements",
    type: "navigate",
    route: "/comms",
    requiredPermissions: [
      Permissions.SEND_ANNOUNCEMENTS,
      Permissions.SEND_CLASS_MESSAGES,
    ],
    category: "comms",
  },
  {
    id: "nav_announcements",
    label: "Go to Announcements",
    description:
      "Navigate to announcements to view or create school-wide updates",
    type: "navigate",
    route: "/comms/announcements",
    requiredPermissions: [Permissions.SEND_ANNOUNCEMENTS],
    category: "comms",
  },
  {
    id: "nav_messages",
    label: "Go to Messages",
    description:
      "Navigate to messaging to send and receive class or direct messages",
    type: "navigate",
    route: "/comms/messages",
    requiredPermissions: [Permissions.SEND_CLASS_MESSAGES],
    category: "comms",
  },

  // ── Navigation: Operations ─────────────────────────────────
  {
    id: "nav_timesheets",
    label: "Go to Timesheets",
    description: "Navigate to timesheets to log or review work hours",
    type: "navigate",
    route: "/timesheets",
    requiredPermissions: [
      Permissions.LOG_TIME,
      Permissions.APPROVE_TIMESHEETS,
      Permissions.VIEW_ALL_TIMESHEETS,
    ],
    category: "operations",
  },
  {
    id: "nav_programs",
    label: "Go to Programs",
    description: "Navigate to OSHC and extended day program management",
    type: "navigate",
    route: "/admin/programs",
    requiredPermissions: [Permissions.MANAGE_PROGRAMS],
    category: "operations",
  },

  // ── Navigation: Admin ──────────────────────────────────────
  {
    id: "nav_admin_settings",
    label: "Go to Admin Settings",
    description: "Navigate to school administration settings and configuration",
    type: "navigate",
    route: "/admin",
    requiredPermissions: [Permissions.MANAGE_TENANT_SETTINGS],
    category: "admin",
  },
  {
    id: "nav_admin_users",
    label: "Go to User Management",
    description: "Navigate to manage staff accounts, roles, and permissions",
    type: "navigate",
    route: "/admin",
    requiredPermissions: [Permissions.MANAGE_USERS],
    category: "admin",
  },
  {
    id: "nav_enrollment",
    label: "Go to Enrollment",
    description:
      "Navigate to enrollment management for applications and periods",
    type: "navigate",
    route: "/admin/enrollment",
    requiredPermissions: [
      Permissions.MANAGE_ENROLLMENT_PERIODS,
      Permissions.REVIEW_APPLICATIONS,
    ],
    category: "admin",
  },
  {
    id: "nav_admissions",
    label: "Go to Admissions",
    description:
      "Navigate to the admissions pipeline, waitlist, and tour scheduling",
    type: "navigate",
    route: "/admin/admissions",
    requiredPermissions: [
      Permissions.MANAGE_WAITLIST,
      Permissions.VIEW_WAITLIST,
    ],
    category: "admin",
  },
  {
    id: "nav_audit_logs",
    label: "Go to Audit Logs",
    description: "Navigate to audit logs for compliance and activity tracking",
    type: "navigate",
    route: "/admin/audit-logs",
    requiredPermissions: [Permissions.VIEW_AUDIT_LOGS],
    category: "admin",
  },

  // ── Navigation: Parent Portal ──────────────────────────────
  {
    id: "nav_parent_portal",
    label: "Go to Parent Portal",
    description:
      "Navigate to the parent portal to view your child's information",
    type: "navigate",
    route: "/parent",
    requiredPermissions: [],
    category: "parent",
  },

  // ── Create Actions ─────────────────────────────────────────
  {
    id: "create_observation",
    label: "Create new observation",
    description:
      "Open the new observation form to record a child's learning moment",
    type: "create",
    route: "/pedagogy/observations/new",
    requiredPermissions: [Permissions.CREATE_OBSERVATION],
    category: "pedagogy",
  },
  {
    id: "create_announcement",
    label: "Create new announcement",
    description: "Open the announcement form to send a school-wide update",
    type: "create",
    route: "/comms/announcements",
    requiredPermissions: [Permissions.SEND_ANNOUNCEMENTS],
    category: "comms",
  },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Returns only the actions the user has permission to access.
 * Uses OR logic: the user needs ANY of the required permissions.
 * Parent-category actions are included when role is "parent".
 */
export function getAvailableActions(
  userPermissions: string[],
  userRole?: "guide" | "parent" | "admin" | "staff",
): WattleAction[] {
  return WATTLE_ACTION_REGISTRY.filter((action) => {
    // Parent-category actions are only shown to parents
    if (action.category === ("parent" as const)) {
      return userRole === "parent";
    }
    // Parents only see general + parent actions (parent handled above)
    if (userRole === "parent" && action.category !== "general") {
      return false;
    }
    // No permission required = always available
    if (action.requiredPermissions.length === 0) return true;
    // OR logic: user needs at least one of the required permissions
    return action.requiredPermissions.some((p) => userPermissions.includes(p));
  });
}

/** Look up a single action by its ID */
export function getActionById(id: string): WattleAction | undefined {
  return WATTLE_ACTION_REGISTRY.find((a) => a.id === id);
}

/**
 * Builds a compact, token-efficient prompt block listing available
 * actions grouped by category. The LLM uses this to know which
 * actions it can suggest via the suggest_actions tool.
 */
export function buildActionPromptBlock(actions: WattleAction[]): string {
  // Group by category
  const grouped = new Map<WattleActionCategory, WattleAction[]>();
  for (const action of actions) {
    const list = grouped.get(action.category) ?? [];
    list.push(action);
    grouped.set(action.category, list);
  }

  const categoryLabels: Record<WattleActionCategory, string> = {
    general: "General",
    pedagogy: "Pedagogy",
    students: "Students",
    attendance: "Attendance",
    operations: "Operations",
    admin: "Administration",
    comms: "Communications",
    parent: "Parent Portal",
  };

  const sections: string[] = [];
  for (const [category, categoryActions] of grouped) {
    const label = categoryLabels[category];
    const lines = categoryActions.map(
      (a) => `- ${a.id}: ${a.label} - ${a.description}`,
    );
    sections.push(`**${label}**\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * Validates an array of action suggestions from the LLM against
 * the user's actual permissions. Strips any the user cannot access.
 */
export function validateActionSuggestions(
  suggestions: WattleActionSuggestion[],
  userPermissions: string[],
  userRole?: "guide" | "parent" | "admin" | "staff",
): WattleActionSuggestion[] {
  const available = getAvailableActions(userPermissions, userRole);
  const availableIds = new Set(available.map((a) => a.id));

  return suggestions.filter((s) => availableIds.has(s.action_id));
}
