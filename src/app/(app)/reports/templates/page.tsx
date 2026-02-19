// src/app/(app)/reports/templates/page.tsx
//
// ============================================================
// WattleOS V2 - Report Templates List Page
// ============================================================
// Server Component. Lists all report templates with usage stats.
// Create, duplicate, deactivate, and delete templates.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { listReportTemplates } from '@/lib/actions/reports';
import type { TemplateWithStats } from '@/lib/actions/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TemplateActions } from '@/components/domain/reports/TemplateActions';

export default async function TemplatesPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect('/dashboard');
  }

  const result = await listReportTemplates({ activeOnly: false });
  const templates = result.data ?? [];

  // Separate active and inactive
  const activeTemplates = templates.filter((t) => t.is_active);
  const inactiveTemplates = templates.filter((t) => !t.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/reports"
              className="text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              Reports
            </Link>
            <span className="text-sm text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Design report formats for your school. Each template defines the sections that appear in student reports.
          </p>
        </div>
        <Link
          href="/reports/templates/new"
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          New Template
        </Link>
      </div>

      {/* Active templates */}
      {activeTemplates.length === 0 && inactiveTemplates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <svg
              className="h-6 w-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No templates yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first report template to start generating student reports.
          </p>
          <Link
            href="/reports/templates/new"
            className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Create Template
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>

          {/* Inactive templates */}
          {inactiveTemplates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-gray-500">
                Inactive Templates ({inactiveTemplates.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactiveTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// TemplateCard - displays a single template with actions
// ============================================================

function TemplateCard({ template }: { template: TemplateWithStats }) {
  // Parse section count from content
  const content = template.content as Record<string, unknown> | null;
  const sections = (content as { sections?: unknown[] } | null)?.sections ?? [];
  const sectionCount = Array.isArray(sections) ? sections.length : 0;

  return (
    <div
      className={`rounded-lg border bg-white p-5 transition-shadow hover:shadow-md ${
        template.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/reports/templates/${template.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-amber-700"
          >
            {template.name}
          </Link>
          {template.cycle_level && (
            <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {template.cycle_level}
            </span>
          )}
          {!template.is_active && (
            <span className="ml-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
              Inactive
            </span>
          )}
        </div>
        <TemplateActions templateId={template.id} isActive={template.is_active} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
        <span>&middot;</span>
        <span>
          {template.reportCount} report{template.reportCount !== 1 ? 's' : ''} generated
        </span>
      </div>

      <div className="mt-4">
        <Link
          href={`/reports/templates/${template.id}`}
          className="text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          Edit Template →
        </Link>
      </div>
    </div>
  );
}