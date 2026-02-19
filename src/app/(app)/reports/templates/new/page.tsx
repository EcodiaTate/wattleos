// src/app/(app)/reports/templates/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create New Report Template
// ============================================================
// Simple form: name + optional cycle level. On submit, creates
// the template with default sections and redirects to the
// builder for customization.
//
// WHY separate page: Gives schools a clean entry point rather
// than dumping them directly into the builder with an unnamed
// template. The name is required upfront.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewTemplateForm } from '@/components/domain/reports/NewTemplateForm';

export default async function NewTemplatePage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/reports" className="hover:text-gray-700">
            Reports
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/reports/templates" className="hover:text-gray-700">
            Templates
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">New</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Create Report Template
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Name your template and choose a cycle level. You&apos;ll customize the sections next.
        </p>
      </div>

      <NewTemplateForm />
    </div>
  );
}