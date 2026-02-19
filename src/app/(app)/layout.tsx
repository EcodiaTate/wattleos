// src/app/(app)/layout.tsx
//
// ============================================================
// WattleOS V2 - App Layout (All Modules 1–14)
// ============================================================
// Server Component that resolves tenant context and builds
// permission-gated navigation items for the sidebar.
//
// WHY server component: getTenantContext() reads the JWT on the
// server - no round-trip needed. Nav items are computed once
// per request, not on every client render.
//
// Modules covered:
//   1  Core Platform        → Dashboard (always visible)
//   2  Curriculum Engine     → /pedagogy/curriculum
//   3  Observation Engine    → /pedagogy/observations
//   4  Mastery & Portfolios  → /pedagogy/mastery
//   5  SIS Core              → /students, /classes
//   6  Attendance & Safety   → /attendance
//   7  Reporting             → /reports
//   9  Timesheets & Payroll  → /timesheets
//  10  Enrollment            → /admin/enrollment
//  11  Programs / OSHC       → /programs
//  12  Communications        → /comms/announcements
//  13  Admissions Pipeline   → /admin/admissions
//  --  Parent Portal         → /parent/*
//  --  Admin / Settings      → /admin
// ============================================================

import { Sidebar } from "@/components/domain/sidebar";
import { getUnacknowledgedCount } from "@/lib/actions/comms/announcements";
import { getUnreadMessageCount } from "@/lib/actions/comms/messaging";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantContext();

  // Fetch unread counts for Communications badge (server-side, no client cost)
  let totalUnreadComms = 0;
  try {
    const [announcementResult, messageResult] = await Promise.all([
      getUnacknowledgedCount(),
      getUnreadMessageCount(),
    ]);
    totalUnreadComms =
      (announcementResult.data ?? 0) + (messageResult.data ?? 0);
  } catch {
    // Non-critical - badges just won't show
  }

  const navItems = buildNavItems(context.permissions, totalUnreadComms);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        tenantName={context.tenant.name}
        tenantLogo={context.tenant.logo_url}
        userName={
          [context.user.first_name, context.user.last_name]
            .filter(Boolean)
            .join(" ") || context.user.email
        }
        userEmail={context.user.email}
        userAvatar={context.user.avatar_url}
        roleName={context.role.name}
        navItems={navItems}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Navigation Builder
// ============================================================
// Each section is permission-gated. Items only appear if the
// user has at least one relevant permission for that module.
// Order matches the logical workflow: pedagogy → students →
// operations → communications → admin.
// ============================================================

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

function buildNavItems(permissions: string[], unreadComms: number): NavItem[] {
  const has = (p: string) => permissions.includes(p);
  const items: NavItem[] = [];

  // ── Always visible ────────────────────────────────────────
  items.push({ label: "Dashboard", href: "/dashboard", icon: "home" });

  // ── Pedagogy (Modules 2–4) ────────────────────────────────
  // WHY grouped: Observations, Curriculum, and Mastery are the
  // core Montessori workflow - guides use them together daily.

  if (
    has(Permissions.CREATE_OBSERVATION) ||
    has(Permissions.VIEW_ALL_OBSERVATIONS)
  ) {
    items.push({
      label: "Observations",
      href: "/pedagogy/observations",
      icon: "eye",
    });
  }

  if (has(Permissions.MANAGE_CURRICULUM)) {
    items.push({
      label: "Curriculum",
      href: "/pedagogy/curriculum",
      icon: "book",
    });
  }

  if (has(Permissions.MANAGE_MASTERY)) {
    items.push({
      label: "Mastery",
      href: "/pedagogy/mastery",
      icon: "chart",
    });
  }

  // ── SIS (Module 5) ───────────────────────────────────────
  if (has(Permissions.VIEW_STUDENTS)) {
    items.push({
      label: "Students",
      href: "/students",
      icon: "users",
    });
  }

  if (has(Permissions.VIEW_STUDENTS) || has(Permissions.MANAGE_ENROLLMENT)) {
    items.push({
      label: "Classes",
      href: "/classes",
      icon: "academic-cap",
    });
  }

  // ── Attendance (Module 6) ─────────────────────────────────
  if (has(Permissions.MANAGE_ATTENDANCE)) {
    items.push({
      label: "Attendance",
      href: "/attendance",
      icon: "clipboard",
    });
  }

  // ── Reports (Module 7) ────────────────────────────────────
  if (has(Permissions.MANAGE_REPORTS)) {
    items.push({
      label: "Reports",
      href: "/reports",
      icon: "file",
    });
  }

  // ── Programs / OSHC (Module 11) ───────────────────────────
  // WHY before Communications: Programs are operational —
  // staff check kids in/out daily. Comms is less frequent.
  if (has(Permissions.MANAGE_PROGRAMS) || has(Permissions.CHECKIN_CHECKOUT)) {
    items.push({
      label: "Programs",
      href: "/programs",
      icon: "calendar",
    });
  }

  // ── Communications (Module 12) ────────────────────────────
  if (
    has(Permissions.SEND_ANNOUNCEMENTS) ||
    has(Permissions.SEND_CLASS_MESSAGES)
  ) {
    items.push({
      label: "Communications",
      href: "/comms/announcements",
      icon: "megaphone",
      badge: unreadComms > 0 ? unreadComms : undefined,
    });
  }

  // ── Timesheets (Module 9) ─────────────────────────────────
  // WHY after Communications: Timesheets is an operational/staff
  // tool, not part of the daily teaching workflow.
  if (has(Permissions.LOG_TIME)) {
    items.push({
      label: "Timesheets",
      href: "/timesheets",
      icon: "clock",
    });
  }

  // ── Parent Portal ─────────────────────────────────────────
  // Parents don't have explicit staff permissions - they're
  // identified by the absence of staff-level permissions.
  // Show parent nav if user has no pedagogy/SIS/attendance perms.
  const isStaff =
    has(Permissions.CREATE_OBSERVATION) ||
    has(Permissions.VIEW_ALL_OBSERVATIONS) ||
    has(Permissions.VIEW_STUDENTS) ||
    has(Permissions.MANAGE_ATTENDANCE);

  if (!isStaff) {
    items.push({
      label: "My Children",
      href: "/parent",
      icon: "heart",
    });
    items.push({
      label: "Announcements",
      href: "/parent/announcements",
      icon: "megaphone",
      badge: unreadComms > 0 ? unreadComms : undefined,
    });
    items.push({
      label: "Messages",
      href: "/parent/messages",
      icon: "chat",
    });
    items.push({
      label: "Events",
      href: "/parent/events",
      icon: "sparkles",
    });
  }

  // ── Admin section ─────────────────────────────────────────
  // Enrollment (Module 10), Admissions (Module 13), and
  // Settings are all admin-level functions grouped at the bottom.

  if (
    has(Permissions.MANAGE_ENROLLMENT_PERIODS) ||
    has(Permissions.REVIEW_APPLICATIONS) ||
    has(Permissions.APPROVE_APPLICATIONS)
  ) {
    items.push({
      label: "Enrollment",
      href: "/admin/enrollment",
      icon: "user-plus",
    });
  }

  if (has(Permissions.MANAGE_WAITLIST) || has(Permissions.VIEW_WAITLIST)) {
    items.push({
      label: "Admissions",
      href: "/admin/admissions",
      icon: "funnel",
    });
  }

  if (
    has(Permissions.MANAGE_USERS) ||
    has(Permissions.MANAGE_TENANT_SETTINGS)
  ) {
    items.push({
      label: "Settings",
      href: "/admin",
      icon: "settings",
    });
  }

  return items;
}
