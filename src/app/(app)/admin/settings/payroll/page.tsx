// src/app/(app)/admin/settings/payroll/page.tsx
//
// ============================================================
// WattleOS V2 - Payroll Settings Page
// ============================================================
// Server Component. Admin can configure:
//   • Pay frequency (weekly/fortnightly/monthly)
//   • Cycle start day
//   • Default work hours (start, end, break)
//   • Payroll provider (None/Xero/KeyPay)
//   • Auto-create periods toggle
//
// WHY separate from general settings: Payroll config is
// complex enough to warrant its own page and is gated to
// MANAGE_INTEGRATIONS rather than MANAGE_TENANT_SETTINGS.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import { getPayrollSettings } from '@/lib/actions/payroll-integration';
import { PayrollSettingsClient } from '@/components/domain/timesheets/payroll-settings-client';
import Link from 'next/link';
import type { PayrollSettings } from '@/types/domain';

export default async function PayrollSettingsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_INTEGRATIONS)) {
    redirect('/dashboard');
  }

  const settingsResult = await getPayrollSettings();
  const settings: PayrollSettings | null = settingsResult.data ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-gray-700">Settings</Link>
          <span>/</span>
          <span className="text-gray-900">Payroll</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Payroll Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure pay cycles, default work hours, and payroll integration
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/timesheets"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Approvals
        </Link>
        <Link
          href="/admin/timesheets/periods"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          Pay Periods
        </Link>
        <Link
          href="/admin/settings/payroll/employees"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          Employee Mapping
        </Link>
      </div>

      {/* Settings form */}
      {settings ? (
        <PayrollSettingsClient settings={settings} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load payroll settings. Please try refreshing the page.
        </div>
      )}
    </div>
  );
}