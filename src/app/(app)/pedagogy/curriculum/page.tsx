import { listCurriculumInstances, listCurriculumTemplates } from '@/lib/actions/curriculum';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import Link from 'next/link';
import { ForkTemplateButton } from '@/components/domain/curriculum/fork-template-button';
import { CreateBlankButton } from '@/components/domain/curriculum/create-blank-button';

export default async function CurriculumPage() {
  const context = await getTenantContext();
  const canManage = hasPermission(context, Permissions.MANAGE_CURRICULUM);

  const [instancesResult, templatesResult] = await Promise.all([
    listCurriculumInstances(),
    listCurriculumTemplates(),
  ]);

  const instances = instancesResult.data ?? [];
  const templates = templatesResult.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your school&apos;s curriculum frameworks
          </p>
        </div>
      </div>

      {/* Existing instances */}
      {instances.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Curricula
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <Link
                key={instance.id}
                href={`/pedagogy/curriculum/${instance.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {instance.name}
                </h3>
                {instance.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                    {instance.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      instance.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {instance.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {instance.source_template_id && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      From Template
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fork from template or create blank */}
      {canManage && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {instances.length > 0
              ? 'Add Another Curriculum'
              : 'Get Started'}
          </h2>
          <p className="text-sm text-gray-500">
            {instances.length > 0
              ? 'Fork from a standard framework or start from scratch.'
              : 'Choose a Montessori curriculum framework to get started instantly, or build your own from scratch.'}
          </p>

          {templates.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-lg border border-dashed border-purple-300 bg-purple-50 p-5"
                >
                  <h3 className="text-sm font-semibold text-purple-900">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-xs text-purple-700">
                    {template.framework} &middot; Ages {template.age_range}
                  </p>
                  {template.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-purple-600">
                      {template.description}
                    </p>
                  )}
                  <div className="mt-4">
                    <ForkTemplateButton
                      templateId={template.id}
                      templateName={template.name}
                    />
                  </div>
                </div>
              ))}

              {/* Create blank option */}
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                <h3 className="text-sm font-semibold text-gray-700">
                  Start from Scratch
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Build a custom curriculum with your own areas, strands, and
                  outcomes.
                </p>
                <div className="mt-4">
                  <CreateBlankButton />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state for non-managers */}
      {!canManage && instances.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No curriculum has been set up yet. Ask your school administrator to
            configure one.
          </p>
        </div>
      )}
    </div>
  );
}
