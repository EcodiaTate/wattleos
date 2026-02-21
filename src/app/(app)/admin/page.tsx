// src/app/(app)/admin/page.tsx
//
// ============================================================
// WattleOS V2 - Admin Landing Page
// ============================================================
// Permission-gated hub linking to all admin sub-sections.
// This file must match the actual app route tree:
//
// src/app/(app)/admin/*
//   admissions (+tours)
//   appearance
//   audit-logs
//   billing
//   data-import
//   enrollment (+applications, invitations, new)
//   integrations
//   settings/payroll
//   timesheets (+periods)
//
// Cards are grouped visually: Core Config → Student Lifecycle
// → Staff Operations → Financial.
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

type AdminCard = {
  label: string;
  description: string;
  href: string;
  icon: string;
  visible: boolean;
  group: "core" | "students" | "staff" | "financial";
};

type AdminQuickLink = {
  label: string;
  href: string;
  visible: boolean;
};

export default async function AdminPage() {
  const context = await getTenantContext();

  // ── Permission checks ───────────────────────────────────
  const canManageTenant = hasPermission(
    context,
    Permissions.MANAGE_TENANT_SETTINGS,
  );

  const canManageIntegrations = hasPermission(
    context,
    Permissions.MANAGE_INTEGRATIONS,
  );

  const canManageAdmissions =
    hasPermission(context, Permissions.MANAGE_WAITLIST) ||
    hasPermission(context, Permissions.VIEW_WAITLIST);

  const canManageEnrollment =
    hasPermission(context, Permissions.MANAGE_ENROLLMENT_PERIODS) ||
    hasPermission(context, Permissions.VIEW_ENROLLMENT_DASHBOARD) ||
    hasPermission(context, Permissions.REVIEW_APPLICATIONS);

  const canApproveTimesheets = hasPermission(
    context,
    Permissions.APPROVE_TIMESHEETS,
  );

  // Data import is usually a tenant/admin capability.
  // If you later add a dedicated permission, swap this out.
  const canImportData = canManageTenant;

  const canViewBilling = canManageTenant;

  const canViewPayrollSettings =
    canManageIntegrations || canManageTenant;

  const canViewAuditLogs = hasPermission(
    context,
    Permissions.VIEW_AUDIT_LOGS,
  );

  // If the user has zero admin-relevant permissions, bounce
  if (
    !canManageTenant &&
    !canManageIntegrations &&
    !canManageAdmissions &&
    !canManageEnrollment &&
    !canApproveTimesheets &&
    !canImportData &&
    !canViewAuditLogs
  ) {
    redirect("/dashboard");
  }

  // ── Card definitions ────────────────────────────────────
  const cards: AdminCard[] = [
    // ── Core Config ────────────────────────────────────────
    {
             group: "core",
             label: "School Settings",
             description: "Name, logo, timezone, colours, and theme.",
             href: "/admin/settings",
             icon: "🏫",
             visible: canManageTenant,
           },
    {
      group: "core",  
      label: "Integrations",
      description: "Connect services and manage system integrations.",
      href: "/admin/integrations",
      icon: "🔌",
      visible: canManageIntegrations || canManageTenant,
    },
    {
      group: "core",
      label: "Data Import",
      description: "Import students, guardians, staff, attendance - and invite in bulk.",
      href: "/admin/data-import",
      icon: "📥",
      visible: canImportData,
    },
    {
      group: "core",
      label: "Audit Logs",
      description: "Security event log — track who did what and when.",
      href: "/admin/audit-logs",
      icon: "🛡️",
      visible: canViewAuditLogs,
    },

    // ── Student Lifecycle ──────────────────────────────────
    {
      group: "students",
      label: "Admissions",
      description: "Waitlist pipeline, tours, and inquiry tracking.",
      href: "/admin/admissions",
      icon: "📋",
      visible: canManageAdmissions,
    },
    {
      group: "students",
      label: "Enrollment",
      description: "Enrollment periods, applications, and invitations.",
      href: "/admin/enrollment",
      icon: "📝",
      visible: canManageEnrollment,
    },

    // ── Staff Ops ──────────────────────────────────────────
    {
      group: "staff",
      label: "Timesheets",
      description: "Review and approve staff timesheets and pay periods.",
      href: "/admin/timesheets",
      icon: "⏱️",
      visible: canApproveTimesheets,
    },
    {
      group: "staff",
      label: "Payroll Settings",
      description: "Payroll configuration and provider mapping.",
      href: "/admin/settings/payroll",
      icon: "💰",
      visible: canViewPayrollSettings,
    },

    // ── Financial ──────────────────────────────────────────
    {
      group: "financial",
      label: "Billing",
      description: "Subscription plan, invoices, and payment history.",
      href: "/admin/billing",
      icon: "💳",
      visible: canViewBilling,
    },
  ];

  const visibleCards = cards.filter((c) => c.visible);

  // Quick links (only show if parent permission is true)
  const quickLinks: AdminQuickLink[] = [
    { label: "Tours", href: "/admin/admissions/tours", visible: canManageAdmissions },
    {
      label: "Applications",
      href: "/admin/enrollment/applications",
      visible: canManageEnrollment,
    },
    {
      label: "Invitations",
      href: "/admin/enrollment/invitations",
      visible: canManageEnrollment,
    },
    {
      label: "New Enrollment Period",
      href: "/admin/enrollment/new",
      visible: canManageEnrollment,
    },
    {
      label: "Pay Periods",
      href: "/admin/timesheets/periods",
      visible: canApproveTimesheets,
    },
  ].filter((q) => q.visible);

  const grouped = {
    core: visibleCards.filter((c) => c.group === "core"),
    students: visibleCards.filter((c) => c.group === "students"),
    staff: visibleCards.filter((c) => c.group === "staff"),
    financial: visibleCards.filter((c) => c.group === "financial"),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your school&apos;s configuration, staff operations, and student lifecycle.
        </p>

        {quickLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-amber-300 hover:text-amber-700"
              >
                {q.label} →
              </Link>
            ))}
          </div>
        )}
      </div>

      <Section title="Core" cards={grouped.core} />
      <Section title="Student Lifecycle" cards={grouped.students} />
      <Section title="Staff Operations" cards={grouped.staff} />
      <Section title="Financial" cards={grouped.financial} />
    </div>
  );
}

function Section({ title, cards }: { title: string; cards: AdminCard[] }) {
  if (!cards.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-border bg-background p-[var(--density-card-padding)] shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
          >
            <span className="text-2xl">{card.icon}</span>
            <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-amber-700">
              {card.label}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}