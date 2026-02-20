// src/app/(app)/admin/page.tsx
//
// ============================================================
// WattleOS V2 — Admin Settings Landing Page
// ============================================================
// Permission-gated hub linking to all admin sub-sections.
// Each card is only visible if the user has at least one
// relevant permission, so different roles see different
// admin surfaces.
//
// Cards are grouped visually: Core Config → Student Lifecycle
// → Staff Operations → Financial.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const context = await getTenantContext();

  // ── Permission checks ───────────────────────────────────
  const canManageTenant = hasPermission(
    context,
    Permissions.MANAGE_TENANT_SETTINGS,
  );
  const canManageUsers = hasPermission(context, Permissions.MANAGE_USERS);
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

  // If the user has zero admin-relevant permissions, bounce
  if (
    !canManageTenant &&
    !canManageUsers &&
    !canManageIntegrations &&
    !canManageAdmissions &&
    !canManageEnrollment &&
    !canApproveTimesheets
  ) {
    redirect("/dashboard");
  }

  // ── Card definitions ────────────────────────────────────
  // WHY array-of-objects: Declarative, easy to reorder, and
  // the visibility flag keeps permission logic out of JSX.
  const cards: Array<{
    label: string;
    description: string;
    href: string;
    icon: string;
    visible: boolean;
  }> = [
    // ── Core School Config ──────────────────────────────────
    {
      label: "School Settings",
      description: "School name, logo, timezone, and billing plan.",
      href: "/admin/settings",
      icon: "🏫",
      visible: canManageTenant,
    },
    {
      label: "School Branding",
      description: "Colours, fonts, and spacing.",
      href: "/admin/appearance",
      icon: "🎨",
      visible: canManageTenant,
    },
    {
      label: "User Management",
      description: "Manage staff accounts, roles, and permissions.",
      href: "/admin/users",
      icon: "👥",
      visible: canManageUsers,
    },
    {
      label: "Integrations",
      description: "Connect Google Drive, Stripe, Xero, and other services.",
      href: "/admin/integrations",
      icon: "🔌",
      visible: canManageIntegrations,
    },

    // ── Student Lifecycle ───────────────────────────────────
    // WHY Admissions before Enrollment: Admissions is the
    // pre-enrollment pipeline (inquiry → waitlist → tour →
    // offer). Enrollment handles the formal application and
    // onboarding that follows. Logical left-to-right flow.
    {
      label: "Admissions",
      description:
        "Waitlist pipeline, tour management, and inquiry tracking.",
      href: "/admin/admissions",
      icon: "📋",
      visible: canManageAdmissions,
    },
    {
      label: "Enrollment",
      description:
        "Enrollment periods, applications, and parent invitations.",
      href: "/admin/enrollment",
      icon: "📝",
      visible: canManageEnrollment,
    },

    // ── Staff Operations ────────────────────────────────────
    {
      label: "Timesheet Approvals",
      description:
        "Review and approve staff timesheets and manage pay periods.",
      href: "/admin/timesheets",
      icon: "⏱️",
      visible: canApproveTimesheets,
    },
    {
      label: "Payroll Settings",
      description:
        "Pay frequency, default hours, provider integration, and employee mapping.",
      href: "/admin/settings/payroll",
      icon: "💰",
      visible: canManageIntegrations,
    },

    // ── Financial ───────────────────────────────────────────
    {
      label: "Billing",
      description: "Subscription plan, invoices, and payment history.",
      href: "/admin/billing",
      icon: "💳",
      visible: canManageTenant,
    },
  ];

  const visibleCards = cards.filter((c) => c.visible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your school&apos;s configuration and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-border bg-background p-[var(--density-card-padding)] shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
          >
            <span className="text-2xl">{card.icon}</span>
            <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-amber-700">
              {card.label}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}