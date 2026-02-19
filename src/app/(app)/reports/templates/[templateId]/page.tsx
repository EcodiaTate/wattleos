// src/app/(app)/reports/templates/[templateId]/page.tsx
//
// ============================================================
// WattleOS V2 - Report Template Builder Page
// ============================================================
// Server Component. Fetches the template, then hands off to
// the TemplateBuilder client component for interactive editing.
//
// WHY server wrapper: Template data is fetched once on the
// server. The builder client component handles all interactive
// state (reordering, adding/removing sections, config panels).
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { getReportTemplate } from '@/lib/actions/reports';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TemplateBuilder } from '@/components/domain/reports/TemplateBuilder';
import type { TemplateContent } from '@/lib/reports/types';

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function TemplateBuilderPage({ params }: PageProps) {
  const { templateId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect('/dashboard');
  }

  const result = await getReportTemplate(templateId);

  if (result.error || !result.data) {
    redirect('/reports/templates');
  }

  const template = result.data;
  const content = template.content as unknown as TemplateContent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <span className="text-gray-900">{template.name}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {template.name}
          </h1>
          {template.cycle_level && (
            <p className="mt-1 text-sm text-gray-500">
              Cycle: {template.cycle_level}
            </p>
          )}
        </div>
      </div>

      {/* Builder */}
      <TemplateBuilder
        templateId={templateId}
        templateName={template.name}
        cycleLevel={template.cycle_level}
        initialContent={content}
      />
    </div>
  );
}