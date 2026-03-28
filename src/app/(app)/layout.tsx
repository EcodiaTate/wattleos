// src/app/(app)/layout.tsx
//
// ============================================================
// WattleOS V2 - App Layout (All Modules 1–14)
// ============================================================
// Server Component that resolves tenant context and builds
// permission-gated, grouped navigation for the sidebar.
//
// WHY server component: getTenantContext() reads the JWT on the
// server - no round-trip needed. Nav groups are computed once
// per request, not on every client render.
//
// WHY grouped nav with emojis: Section labels ("Pedagogy",
// "Operations") give better discoverability than a flat list.
// Guides scan by domain instead of reading every label. Emojis
// provide fast visual anchoring without the bundle cost of an
// icon library.
//
// Modules covered:
//   1  Core Platform        → Dashboard (always visible)
//   2  Curriculum Engine     → /pedagogy/curriculum
//   3  Observation Engine    → /pedagogy/observations
//   4  Mastery & Portfolios  → /pedagogy/mastery
//   5  SIS Core              → /students
//   6  Attendance & Safety   → /attendance
//   7  Reporting             → /reports
//   9  Timesheets & Payroll  → /admin/timesheets
//  10  Enrollment            → /admin/enrollment
//  11  Programs / OSHC       → /admin/programs
//  12  Communications        → /comms
//  13  Admissions Pipeline   → /admin/admissions
//  14  Curriculum Content    → /admin/curriculum-templates
//  --  Parent Portal         → /parent/*
//  --  Admin / Settings      → /admin, /settings
// ============================================================

import type { ReactNode } from "react";

import { AskWattleProvider } from "@/components/domain/ask-wattle/ask-wattle-provider";
import { SessionTimeout } from "@/components/domain/auth/session-timeout";
import { GlowRegistryProvider } from "@/components/domain/glow/glow-registry";
import { AppSidebar } from "@/components/domain/sidebar";
import { NativeInitializer } from "@/components/native/NativeInitializer";
import { EmergencyBanner } from "@/components/domain/emergency-coordination/emergency-banner";
import { getUnacknowledgedCount } from "@/lib/actions/comms/announcements";
import { getUnreadMessageCount } from "@/lib/actions/comms/messaging";
import { getActiveEmergencyBanner } from "@/lib/actions/emergency-coordination";
import {
  getTenantContext,
  getUserTenants,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

// ============================================================
// Ask Wattle Role Inference
// ============================================================
// Maps the permission set to one of four audience categories.
// Priority order matters: admin trumps guide trumps staff
// trumps parent. A "Head of School" with both admin and guide
// permissions gets "admin" so Wattle gives system-level answers.
// ============================================================

function inferWattleRole(
  permissions: string[],
): "guide" | "parent" | "admin" | "staff" {
  const has = (p: string) => permissions.includes(p);

  if (
    has(Permissions.MANAGE_TENANT_SETTINGS) ||
    has(Permissions.MANAGE_USERS)
  ) {
    return "admin";
  }

  if (has(Permissions.CREATE_OBSERVATION)) {
    return "guide";
  }

  if (has(Permissions.MANAGE_ATTENDANCE) || has(Permissions.MANAGE_STUDENTS)) {
    return "staff";
  }

  return "parent";
}

// ============================================================
// Types - shared with the client sidebar component
// ============================================================

export type SidebarNavItem = {
  label: string;
  href: string;
  emoji: string;
  badge?: number;
};

export type SidebarNavGroup = {
  label: string;
  items: SidebarNavItem[];
};

// Up to 4 pinned tabs in the mobile bottom bar.
// Always followed by a "More" tab that opens the full sidebar drawer.
export type MobileTabItem = SidebarNavItem;

// ============================================================
// Layout
// ============================================================

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getTenantContext();

  const can = (perm: (typeof Permissions)[keyof typeof Permissions]) =>
    hasPermission(ctx, perm);

  // Fetch unread counts and tenant count in parallel (server-side, no client cost).
  // WHY getUserTenants here: Controls whether "Switch School" button appears.
  // Single-tenant users (the majority) don't need it - it would just
  // auto-select the same school and waste a round-trip.
  let totalUnreadComms = 0;
  let tenantCount = 1;
  let emergencyBannerData: {
    id: string;
    event_type: string;
    severity: string;
    activated_at: string;
    status: string;
    students_unaccounted: number;
    students_total: number;
  } | null = null;
  try {
    const [announcementResult, messageResult, userTenants, bannerResult] =
      await Promise.all([
        getUnacknowledgedCount(),
        getUnreadMessageCount(),
        getUserTenants(ctx.user.id),
        getActiveEmergencyBanner(),
      ]);
    totalUnreadComms =
      (announcementResult.data ?? 0) + (messageResult.data ?? 0);
    tenantCount = userTenants.length;
    emergencyBannerData = bannerResult.data ?? null;
  } catch {
    // Non-critical - badges just won't show, switcher defaults to hidden
  }

  // Infer simplified role for Ask Wattle's audience-aware responses.
  // WHY not pass the role name: Role names are tenant-customisable
  // ("Head of School", "Lead Guide"). Wattle needs a stable category.
  const wattleRole = inferWattleRole(ctx.permissions);

  // Sensitive data mode: both flags must align for the indicator to show.
  const wattleSensitiveData =
    ctx.tenant.ai_sensitive_data_enabled &&
    !ctx.tenant.ai_disable_sensitive_tools;

  // ──────────────────────────────────────────────────────────
  // Build grouped, permission-gated navigation
  // ──────────────────────────────────────────────────────────
  // Each item has a `visible` flag computed from permissions.
  // We filter invisible items and empty groups before passing
  // to the client sidebar.
  //
  // Order follows the logical workflow: core → pedagogy →
  // students → operations → staff → content/compliance.
  // ──────────────────────────────────────────────────────────

  const isStaff =
    can(Permissions.CREATE_OBSERVATION) ||
    can(Permissions.VIEW_ALL_OBSERVATIONS) ||
    can(Permissions.VIEW_STUDENTS) ||
    can(Permissions.MANAGE_ATTENDANCE) ||
    can(Permissions.MANAGE_USERS) ||
    can(Permissions.MANAGE_TENANT_SETTINGS);

  const rawNav: Array<{
    label: string;
    items: Array<SidebarNavItem & { visible: boolean }>;
  }> = isStaff
    ? [
        // ── Staff / Admin navigation ──────────────────────────
        {
          label: "Core",
          items: [
            {
              label: "Dashboard",
              href: "/dashboard",
              emoji: "🏠",
              visible: true,
            },
            {
              label: "Admin",
              href: "/admin",
              emoji: "🛡️",
              visible:
                can(Permissions.MANAGE_USERS) ||
                can(Permissions.MANAGE_TENANT_SETTINGS),
            },
          ],
        },
        {
          label: "Pedagogy",
          items: [
            {
              label: "Observations",
              href: "/pedagogy/observations",
              emoji: "📝",
              visible:
                can(Permissions.VIEW_ALL_OBSERVATIONS) ||
                can(Permissions.CREATE_OBSERVATION) ||
                can(Permissions.PUBLISH_OBSERVATION),
            },
            {
              label: "Curriculum",
              href: "/pedagogy/curriculum",
              emoji: "🧩",
              visible: can(Permissions.MANAGE_CURRICULUM),
            },
            {
              label: "Mastery",
              href: "/pedagogy/mastery",
              emoji: "⭐",
              visible: can(Permissions.MANAGE_MASTERY),
            },
            {
              label: "Report Periods",
              href: "/reports/periods",
              emoji: "📄",
              visible: can(Permissions.MANAGE_REPORT_PERIODS),
            },
            {
              label: "My Reports",
              href: "/reports/my-reports",
              emoji: "📝",
              visible:
                can(Permissions.VIEW_REPORT_PERIODS) ||
                can(Permissions.MANAGE_REPORTS),
            },
          ],
        },
        {
          label: "Students",
          items: [
            {
              label: "Students",
              href: "/students",
              emoji: "👧",
              visible:
                can(Permissions.VIEW_STUDENTS) ||
                can(Permissions.MANAGE_STUDENTS),
            },
            {
              label: "Classes",
              href: "/classes",
              emoji: "🏫",
              visible:
                can(Permissions.VIEW_CLASSES) ||
                can(Permissions.MANAGE_CLASSES),
            },
            {
              label: "Enrollment",
              href: "/admin/enrollment",
              emoji: "🧾",
              visible:
                can(Permissions.MANAGE_ENROLLMENT) ||
                can(Permissions.MANAGE_ENROLLMENT_PERIODS) ||
                can(Permissions.REVIEW_APPLICATIONS) ||
                can(Permissions.APPROVE_APPLICATIONS) ||
                can(Permissions.VIEW_ENROLLMENT_DASHBOARD),
            },
            {
              label: "Admissions",
              href: "/admin/admissions",
              emoji: "📥",
              visible:
                can(Permissions.VIEW_WAITLIST) ||
                can(Permissions.MANAGE_WAITLIST) ||
                can(Permissions.MANAGE_TOURS) ||
                can(Permissions.VIEW_ADMISSIONS_ANALYTICS),
            },
            {
              label: "Previous Schools",
              href: "/students/previous-schools",
              emoji: "🏫",
              visible:
                can(Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS) ||
                can(Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS),
            },
          ],
        },
        {
          label: "Operations",
          items: [
            {
              label: "Attendance",
              href: "/attendance",
              emoji: "🗓️",
              visible:
                can(Permissions.MANAGE_ATTENDANCE) ||
                can(Permissions.VIEW_ATTENDANCE_REPORTS),
            },
            {
              label: "Kiosk",
              href: "/attendance/kiosk",
              emoji: "🚪",
              visible: can(Permissions.MANAGE_ATTENDANCE),
            },
            {
              label: "Sign-In/Out Log",
              href: "/attendance/sign-in-out",
              emoji: "📋",
              visible: can(Permissions.MANAGE_ATTENDANCE),
            },
            {
              label: "Programs",
              href: "/admin/programs",
              emoji: "🎒",
              visible:
                can(Permissions.MANAGE_PROGRAMS) ||
                can(Permissions.MANAGE_BOOKINGS) ||
                can(Permissions.CHECKIN_CHECKOUT) ||
                can(Permissions.VIEW_PROGRAM_REPORTS) ||
                can(Permissions.MANAGE_CCS_SETTINGS),
            },
            {
              label: "Comms",
              href: "/comms",
              emoji: "💬",
              visible:
                can(Permissions.SEND_ANNOUNCEMENTS) ||
                can(Permissions.SEND_CLASS_MESSAGES) ||
                can(Permissions.MANAGE_EVENTS) ||
                can(Permissions.MODERATE_CHAT) ||
                can(Permissions.MANAGE_DIRECTORY) ||
                can(Permissions.VIEW_MESSAGE_ANALYTICS),
              badge: totalUnreadComms > 0 ? totalUnreadComms : undefined,
            },
            {
              label: "Newsletter",
              href: "/comms/newsletters",
              emoji: "📰",
              visible:
                can(Permissions.VIEW_NEWSLETTER) ||
                can(Permissions.MANAGE_NEWSLETTER),
            },
            {
              label: "Push Notifications",
              href: "/admin/notifications",
              emoji: "🔔",
              visible:
                can(Permissions.MANAGE_PUSH_NOTIFICATIONS) ||
                can(Permissions.VIEW_NOTIFICATION_ANALYTICS),
            },
            {
              label: "My Schedule",
              href: "/my-schedule",
              emoji: "🗓️",
              visible:
                can(Permissions.VIEW_ROSTER) ||
                can(Permissions.REQUEST_LEAVE) ||
                can(Permissions.ACCEPT_COVERAGE),
            },
            {
              label: "School Photos",
              href: "/admin/school-photos",
              emoji: "📸",
              visible:
                can(Permissions.VIEW_SCHOOL_PHOTOS) ||
                can(Permissions.MANAGE_SCHOOL_PHOTOS),
            },
            {
              label: "Dismissal",
              href: "/attendance/dismissal",
              emoji: "🏃",
              visible:
                can(Permissions.VIEW_DISMISSAL) ||
                can(Permissions.MANAGE_DISMISSAL),
            },
            {
              label: "Visitor Log",
              href: "/attendance/visitors",
              emoji: "🪪",
              visible:
                can(Permissions.VIEW_VISITOR_LOG) ||
                can(Permissions.MANAGE_VISITOR_LOG),
            },
            {
              label: "Contractor Log",
              href: "/attendance/contractors",
              emoji: "🔧",
              visible:
                can(Permissions.VIEW_CONTRACTOR_LOG) ||
                can(Permissions.MANAGE_CONTRACTOR_LOG),
            },
            {
              label: "Chronic Absence",
              href: "/attendance/chronic-absence",
              emoji: "📉",
              visible:
                can(Permissions.VIEW_CHRONIC_ABSENCE) ||
                can(Permissions.MANAGE_CHRONIC_ABSENCE),
            },
            {
              label: "ACARA Reporting",
              href: "/attendance/acara-reporting",
              emoji: "📋",
              visible:
                can(Permissions.VIEW_ACARA_REPORTING) ||
                can(Permissions.MANAGE_ACARA_REPORTING),
            },
            {
              label: "Absence Follow-up",
              href: "/attendance/absence-followup",
              emoji: "📞",
              visible:
                can(Permissions.VIEW_ABSENCE_FOLLOWUP) ||
                can(Permissions.MANAGE_ABSENCE_FOLLOWUP),
            },
            {
              label: "PT Interviews",
              href: "/interviews",
              emoji: "🎙️",
              visible:
                can(Permissions.BOOK_INTERVIEW) ||
                can(Permissions.VIEW_INTERVIEW_SCHEDULE) ||
                can(Permissions.MANAGE_INTERVIEW_SESSIONS),
            },
          ],
        },
        {
          label: "Staff & Payroll",
          items: [
            {
              label: "My Timesheet",
              href: "/timesheets",
              emoji: "⏱️",
              visible: can(Permissions.LOG_TIME),
            },
            {
              label: "Timesheet Approvals",
              href: "/admin/timesheets",
              emoji: "✅",
              visible:
                can(Permissions.APPROVE_TIMESHEETS) ||
                can(Permissions.VIEW_ALL_TIMESHEETS),
            },
            {
              label: "Rostering",
              href: "/admin/rostering",
              emoji: "📅",
              visible:
                can(Permissions.MANAGE_ROSTER) ||
                can(Permissions.MANAGE_LEAVE) ||
                can(Permissions.MANAGE_COVERAGE),
            },
            {
              label: "Payroll Settings",
              href: "/admin/settings/payroll",
              emoji: "💰",
              visible: can(Permissions.MANAGE_TENANT_SETTINGS),
            },
          ],
        },
        {
          label: "Finance",
          items: [
            {
              label: "Billing",
              href: "/admin/billing",
              emoji: "🧾",
              visible:
                can(Permissions.VIEW_BILLING) ||
                can(Permissions.MANAGE_BILLING),
            },
            {
              label: "Recurring Billing",
              href: "/admin/recurring-billing",
              emoji: "♻️",
              visible:
                can(Permissions.VIEW_RECURRING_BILLING) ||
                can(Permissions.MANAGE_RECURRING_BILLING),
            },
            {
              label: "Debt Management",
              href: "/admin/debt",
              emoji: "💳",
              visible:
                can(Permissions.VIEW_DEBT_MANAGEMENT) ||
                can(Permissions.MANAGE_DEBT_MANAGEMENT),
            },
            {
              label: "Grant Tracking",
              href: "/admin/grant-tracking",
              emoji: "🏦",
              visible:
                can(Permissions.VIEW_GRANT_TRACKING) ||
                can(Permissions.MANAGE_GRANT_TRACKING),
            },
            {
              label: "Fee Notices",
              href: "/admin/fee-notice-comms",
              emoji: "📨",
              visible:
                can(Permissions.VIEW_FEE_NOTICE_COMMS) ||
                can(Permissions.MANAGE_FEE_NOTICE_COMMS),
            },
            {
              label: "Tuckshop",
              href: "/admin/tuckshop",
              emoji: "🥪",
              visible: can(Permissions.MANAGE_TUCKSHOP),
            },
          ],
        },
        {
          label: "Compliance",
          items: [
            {
              label: "Incidents",
              href: "/incidents",
              emoji: "🚨",
              visible:
                can(Permissions.CREATE_INCIDENT) ||
                can(Permissions.VIEW_INCIDENTS),
            },
            {
              label: "Medication",
              href: "/medication",
              emoji: "💊",
              visible:
                can(Permissions.VIEW_MEDICATION_RECORDS) ||
                can(Permissions.ADMINISTER_MEDICATION) ||
                can(Permissions.MANAGE_MEDICATION_PLANS),
            },
            {
              label: "Daily Care Log",
              href: "/admin/daily-care-log",
              emoji: "🍼",
              visible:
                can(Permissions.VIEW_DAILY_CARE_LOGS) ||
                can(Permissions.MANAGE_DAILY_CARE_LOGS),
            },
            {
              label: "Sick Bay",
              href: "/admin/sick-bay",
              emoji: "🩹",
              visible:
                can(Permissions.VIEW_SICK_BAY) ||
                can(Permissions.MANAGE_SICK_BAY),
            },
            {
              label: "Excursions",
              href: "/excursions",
              emoji: "🚌",
              visible:
                can(Permissions.MANAGE_EXCURSIONS) ||
                can(Permissions.VIEW_EXCURSIONS),
            },
            {
              label: "Volunteers",
              href: "/admin/volunteers",
              emoji: "🙋",
              visible:
                can(Permissions.VIEW_VOLUNTEERS) ||
                can(Permissions.MANAGE_VOLUNTEERS),
            },
            {
              label: "Staff Compliance",
              href: "/admin/staff-compliance",
              emoji: "🪪",
              visible:
                can(Permissions.VIEW_STAFF_COMPLIANCE) ||
                can(Permissions.MANAGE_STAFF_COMPLIANCE),
            },
            {
              label: "Ratios",
              href: "/admin/ratios",
              emoji: "👥",
              visible:
                can(Permissions.VIEW_RATIOS) ||
                can(Permissions.MANAGE_FLOOR_SIGNIN),
            },
            {
              label: "QIP",
              href: "/admin/qip",
              emoji: "📊",
              visible: can(Permissions.VIEW_QIP) || can(Permissions.MANAGE_QIP),
            },
            {
              label: "Immunisation",
              href: "/admin/immunisation",
              emoji: "💉",
              visible:
                can(Permissions.VIEW_IMMUNISATION) ||
                can(Permissions.MANAGE_IMMUNISATION),
            },
            {
              label: "CCS Reports",
              href: "/admin/ccs",
              emoji: "📑",
              visible:
                can(Permissions.VIEW_CCS_REPORTS) ||
                can(Permissions.MANAGE_CCS_REPORTS),
            },
            {
              label: "Policies",
              href: "/admin/policies",
              emoji: "📋",
              visible:
                can(Permissions.MANAGE_POLICIES) ||
                can(Permissions.VIEW_COMPLAINTS) ||
                can(Permissions.MANAGE_COMPLAINTS),
            },
            {
              label: "Emergency Drills",
              href: "/admin/emergency-drills",
              emoji: "🔔",
              visible:
                can(Permissions.VIEW_EMERGENCY_DRILLS) ||
                can(Permissions.MANAGE_EMERGENCY_DRILLS),
            },
            {
              label: "Emergency Live",
              href: "/admin/emergency-coordination",
              emoji: "🆘",
              visible:
                can(Permissions.VIEW_EMERGENCY_COORDINATION) ||
                can(Permissions.COORDINATE_EMERGENCY) ||
                can(Permissions.ACTIVATE_EMERGENCY),
            },
            {
              label: "Lessons",
              href: "/pedagogy/lessons",
              emoji: "🔤",
              visible:
                can(Permissions.VIEW_LESSON_RECORDS) ||
                can(Permissions.MANAGE_LESSON_RECORDS),
            },
            {
              label: "3P Lessons",
              href: "/pedagogy/three-period-lessons",
              emoji: "🔢",
              visible:
                can(Permissions.VIEW_LESSON_RECORDS) ||
                can(Permissions.MANAGE_LESSON_RECORDS),
            },
            {
              label: "Sensitive Periods",
              href: "/pedagogy/sensitive-periods",
              emoji: "🌿",
              visible:
                can(Permissions.VIEW_LESSON_RECORDS) ||
                can(Permissions.MANAGE_LESSON_RECORDS),
            },
            {
              label: "Normalization",
              href: "/pedagogy/normalization",
              emoji: "🧘",
              visible:
                can(Permissions.VIEW_NORMALIZATION) ||
                can(Permissions.MANAGE_NORMALIZATION),
            },
            {
              label: "Work Cycles",
              href: "/pedagogy/work-cycles",
              emoji: "⏱️",
              visible:
                can(Permissions.VIEW_WORK_CYCLES) ||
                can(Permissions.MANAGE_WORK_CYCLES),
            },
            {
              label: "Materials",
              href: "/pedagogy/materials",
              emoji: "🪵",
              visible:
                can(Permissions.VIEW_MATERIAL_INVENTORY) ||
                can(Permissions.MANAGE_MATERIAL_INVENTORY),
            },
            {
              label: "Environment",
              href: "/pedagogy/environment-planner",
              emoji: "🌿",
              visible:
                can(Permissions.VIEW_ENVIRONMENT_PLANNER) ||
                can(Permissions.MANAGE_ENVIRONMENT_PLANNER),
            },
            {
              label: "3yr Cycle",
              href: "/pedagogy/three-year-cycle",
              emoji: "🔁",
              visible:
                can(Permissions.VIEW_LESSON_RECORDS) ||
                can(Permissions.MANAGE_LESSON_RECORDS),
            },
            {
              label: "MQ:AP",
              href: "/admin/mqap",
              emoji: "🎓",
              visible:
                can(Permissions.VIEW_MQAP) || can(Permissions.MANAGE_MQAP),
            },
            {
              label: "Accreditation",
              href: "/pedagogy/accreditation",
              emoji: "🏅",
              visible:
                can(Permissions.VIEW_ACCREDITATION) ||
                can(Permissions.MANAGE_ACCREDITATION),
            },
            {
              label: "Cosmic Education",
              href: "/pedagogy/cosmic-education",
              emoji: "🌌",
              visible:
                can(Permissions.VIEW_COSMIC_EDUCATION) ||
                can(Permissions.MANAGE_COSMIC_EDUCATION),
            },
            {
              label: "Montessori Hub",
              href: "/pedagogy/montessori-hub",
              emoji: "📖",
              visible:
                can(Permissions.VIEW_MONTESSORI_HUB) ||
                can(Permissions.MANAGE_MONTESSORI_HUB),
            },
            {
              label: "Learning Plans",
              href: "/admin/learning-plans",
              emoji: "🌱",
              visible: can(Permissions.VIEW_ILP) || can(Permissions.MANAGE_ILP),
            },
            {
              label: "NCCD Register",
              href: "/admin/nccd",
              emoji: "♿",
              visible:
                can(Permissions.VIEW_NCCD) || can(Permissions.MANAGE_NCCD),
            },
            {
              label: "Wellbeing",
              href: "/admin/wellbeing",
              emoji: "💚",
              visible:
                can(Permissions.VIEW_WELLBEING) ||
                can(Permissions.MANAGE_WELLBEING),
            },
            {
              label: "Interview Sessions",
              href: "/admin/interviews",
              emoji: "🎙️",
              visible: can(Permissions.MANAGE_INTERVIEW_SESSIONS),
            },
            {
              label: "NAPLAN",
              href: "/admin/naplan",
              emoji: "📝",
              visible:
                can(Permissions.VIEW_NAPLAN) || can(Permissions.MANAGE_NAPLAN),
            },
            {
              label: "SMS Gateway",
              href: "/admin/sms-gateway",
              emoji: "📲",
              visible:
                can(Permissions.VIEW_SMS_GATEWAY) ||
                can(Permissions.MANAGE_SMS_GATEWAY),
            },
          ],
        },
        {
          label: "Content",
          items: [
            {
              label: "Content Library",
              href: "/pedagogy/content-library",
              emoji: "📚",
              visible: can(Permissions.MANAGE_CURRICULUM_TEMPLATES),
            },
            {
              label: "Cross-mappings",
              href: "/pedagogy/content-library/cross-mappings",
              emoji: "🧠",
              visible: can(Permissions.MANAGE_CROSS_MAPPINGS),
            },
            {
              label: "Compliance Reports",
              href: "/admin/compliance",
              emoji: "✅",
              visible: can(Permissions.VIEW_COMPLIANCE_REPORTS),
            },
          ],
        },
        {
          label: "Account",
          items: [
            {
              label: "Notification Prefs",
              href: "/settings/notifications",
              emoji: "🔔",
              visible: true,
            },
          ],
        },
      ]
    : [
        // ── Parent navigation ─────────────────────────────────
        // Parents don't have staff-level permissions. They get a
        // simplified nav focused on their children's experience.
        {
          label: "Home",
          items: [
            {
              label: "Dashboard",
              href: "/dashboard",
              emoji: "🏠",
              visible: true,
            },
            {
              label: "My Children",
              href: "/parent",
              emoji: "💛",
              visible: true,
            },
          ],
        },
        {
          label: "Stay Connected",
          items: [
            {
              label: "Announcements",
              href: "/parent/announcements",
              emoji: "📢",
              visible: true,
              badge: totalUnreadComms > 0 ? totalUnreadComms : undefined,
            },
            {
              label: "Messages",
              href: "/parent/messages",
              emoji: "💬",
              visible: true,
            },
            {
              label: "Events",
              href: "/parent/events",
              emoji: "✨",
              visible: true,
            },
            {
              label: "Newsletter",
              href: "/parent/newsletters",
              emoji: "📰",
              visible: true,
            },
            {
              label: "Tuckshop",
              href: "/parent-portal/tuckshop",
              emoji: "🥪",
              visible: can(Permissions.PLACE_TUCKSHOP_ORDER),
            },
          ],
        },
        {
          label: "Billing",
          items: [
            {
              label: "Invoices",
              href: "/parent/billing",
              emoji: "🧾",
              visible: true,
            },
            {
              label: "Direct Debit",
              href: "/parent/recurring-billing",
              emoji: "♻️",
              visible: true,
            },
          ],
        },
        {
          label: "Settings",
          items: [
            {
              label: "Notifications",
              href: "/settings/notifications",
              emoji: "🔔",
              visible: true,
            },
          ],
        },
      ];

  // Strip invisible items and empty groups
  const navGroups: SidebarNavGroup[] = rawNav
    .map((g) => ({
      label: g.label,
      items: g.items
        .filter((i) => i.visible)
        .map(({ visible: _visible, ...item }) => item),
    }))
    .filter((g) => g.items.length > 0);

  // Fallback - should never happen, but prevents an empty sidebar
  const safeNavGroups: SidebarNavGroup[] =
    navGroups.length > 0
      ? navGroups
      : [
          {
            label: "Home",
            items: [{ label: "Dashboard", href: "/dashboard", emoji: "🏠" }],
          },
        ];

  // ──────────────────────────────────────────────────────────
  // Mobile tab bar items (up to 4, then "More" is auto-added)
  // ──────────────────────────────────────────────────────────
  // Pick the most-used screens for each role. Permission-gated
  // the same way as the sidebar nav. Limited to 4 so there's
  // always room for the "More" tab at position 5.
  const rawMobileTabs: Array<MobileTabItem & { visible: boolean }> = isStaff
    ? [
        { label: "Dashboard", href: "/dashboard", emoji: "🏠", visible: true },
        {
          label: "Observations",
          href: "/pedagogy/observations",
          emoji: "📝",
          visible:
            can(Permissions.CREATE_OBSERVATION) ||
            can(Permissions.VIEW_ALL_OBSERVATIONS),
        },
        {
          label: "Attendance",
          href: "/attendance",
          emoji: "🗓️",
          visible:
            can(Permissions.MANAGE_ATTENDANCE) ||
            can(Permissions.VIEW_ATTENDANCE_REPORTS),
        },
        {
          label: "Comms",
          href: "/comms",
          emoji: "💬",
          visible:
            can(Permissions.SEND_ANNOUNCEMENTS) ||
            can(Permissions.SEND_CLASS_MESSAGES) ||
            can(Permissions.MODERATE_CHAT),
          badge: totalUnreadComms > 0 ? totalUnreadComms : undefined,
        },
      ]
    : [
        { label: "Home", href: "/dashboard", emoji: "🏠", visible: true },
        { label: "My Children", href: "/parent", emoji: "💛", visible: true },
        {
          label: "Announcements",
          href: "/parent/announcements",
          emoji: "📢",
          visible: true,
          badge: totalUnreadComms > 0 ? totalUnreadComms : undefined,
        },
        {
          label: "Messages",
          href: "/parent/messages",
          emoji: "💬",
          visible: true,
        },
      ];

  const mobileTabItems: MobileTabItem[] = rawMobileTabs
    .filter((i) => i.visible)
    .slice(0, 4)
    .map(({ visible: _v, ...item }) => item);

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────

  return (
    // h-dvh: dynamic viewport height - accounts for browser chrome on mobile.
    // On iOS/Android WebView this equals the full native screen height.
    <GlowRegistryProvider>
      <div className="flex h-dvh bg-background text-foreground">
        {/* Bootstraps Capacitor plugins once on mount. No-op on web. */}
        <NativeInitializer />
        {/* Idle timeout: 15min idle → warning, 60s → auto-logout. Critical for shared classroom iPads. */}
        <SessionTimeout />
        <AppSidebar
          tenantName={ctx.tenant.name}
          tenantLogo={ctx.tenant.logo_url}
          userName={
            [ctx.user.first_name, ctx.user.last_name]
              .filter(Boolean)
              .join(" ") || ctx.user.email
          }
          userEmail={ctx.user.email}
          userAvatar={ctx.user.avatar_url}
          roleName={ctx.role.name}
          navGroups={safeNavGroups}
          mobileTabItems={mobileTabItems}
          showTenantSwitcher={tenantCount > 1}
        />

        {/*
        flex-1 + scroll-native: single native-scroll container with
        iOS momentum scrolling. pb-tab-bar ensures content isn't hidden
        behind the fixed bottom tab bar (including safe-area-inset-bottom).
        On desktop (lg:), no tab bar so no bottom padding needed.
        pt-safe-top ensures content clears the status bar on native.
      */}
        <main
          className="scroll-native flex-1 pb-tab-bar lg:pb-0"
          style={{ paddingTop: "var(--safe-top)" }}
        >
          <EmergencyBanner
            tenantId={ctx.tenant.id}
            initialData={emergencyBannerData}
          />
          <AskWattleProvider
            userRole={wattleRole}
            userName={ctx.user.first_name ?? undefined}
            permissions={ctx.permissions}
            tenantName={ctx.tenant.name ?? undefined}
            sensitiveDataEnabled={wattleSensitiveData}
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 page-enter">
              {children}
            </div>
          </AskWattleProvider>
        </main>
      </div>
    </GlowRegistryProvider>
  );
}
