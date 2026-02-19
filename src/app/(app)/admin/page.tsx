// src/app/(app)/admin/page.tsx
//
// ============================================================
// WattleOS V2 - Admin Settings Landing Page
// ============================================================
// Permission-gated. Shows cards linking to admin sub-sections:
// integrations, user management, tenant settings, timesheet
// approvals, and payroll configuration.
//
// MODIFIED IN PHASE 9c: Added Timesheet Approvals card
// (gated on APPROVE_TIMESHEETS) and Payroll Settings card
// (gated on MANAGE_INTEGRATIONS).
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminPage() {
  const context = await getTenantContext();

  const canManageUsers = hasPermission(context, Permissions.MANAGE_USERS);
  const canManageTenant = hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS);
  const canManageIntegrations = hasPermission(context, Permissions.MANAGE_INTEGRATIONS);
  const canApproveTimesheets = hasPermission(context, Permissions.APPROVE_TIMESHEETS);

  if (!canManageUsers && !canManageTenant && !canManageIntegrations && !canApproveTimesheets) {
    redirect('/dashboard');
  }

  const cards: Array<{
    label: string;
    description: string;
    href: string;
    icon: string;
    visible: boolean;
  }> = [
    {
      label: 'Integrations',
      description: 'Connect Google Drive, Stripe, Xero, and other services.',
      href: '/admin/integrations',
      icon: '🔌',
      visible: canManageIntegrations,
    },
    {
      label: 'User Management',
      description: 'Manage staff accounts, roles, and permissions.',
      href: '/admin/users',
      icon: '👥',
      visible: canManageUsers,
    },
    {
      label: 'School Settings',
      description: 'School name, logo, timezone, and billing plan.',
      href: '/admin/settings',
      icon: '🏫',
      visible: canManageTenant,
    },
    {
      label: 'School Branding',
      description: 'Colours, fonts, spacing.',
      href: '/admin/appearance',
      icon: '🏫',
      visible: canManageTenant,
    },
    // Phase 9c: Timesheet Approvals
    // WHY here: Approvers (Head of School) need quick access to
    // pending timesheets from the admin hub.
    {
      label: 'Timesheet Approvals',
      description: 'Review and approve staff timesheets and manage pay periods.',
      href: '/admin/timesheets',
      icon: '⏱️',
      visible: canApproveTimesheets,
    },
    // Phase 9c: Payroll Settings
    // WHY separate card: Payroll config (frequency, defaults, provider)
    // is a distinct concern from timesheet approval workflow.
    {
      label: 'Payroll Settings',
      description: 'Pay frequency, default hours, provider integration, and employee mapping.',
      href: '/admin/settings/payroll',
      icon: '💰',
      visible: canManageIntegrations,
    },
  ];

  const visibleCards = cards.filter((c) => c.visible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your school&apos;s configuration and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
          >
            <span className="text-2xl">{card.icon}</span>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 group-hover:text-amber-700">
              {card.label}
            </h3>
            <p className="mt-1 text-xs text-gray-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}