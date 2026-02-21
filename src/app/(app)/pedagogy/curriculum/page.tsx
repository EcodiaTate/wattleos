// src/app/(app)/(app)/pedagogy/curriculum/page.tsx
//
// ============================================================
// WattleOS V2 - Module 2: Curriculum Page
// ============================================================
// Updated to include a link to the Module 14 Content Library.
// WHY: The Content Library is the primary way admins discover
// and import templates. Without this link, it's unreachable
// except through the sidebar (which we're also adding).
// ============================================================

import { CreateBlankButton } from "@/components/domain/curriculum/create-blank-button";
import { ForkTemplateButton } from "@/components/domain/curriculum/fork-template-button";
import {
  listCurriculumInstances,
  listCurriculumTemplates,
} from "@/lib/actions/curriculum";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";

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
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      <div className="flex items-start justify-between gap-4 animate-fade-in-down">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Curriculum</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your school&apos;s curriculum frameworks
          </p>
        </div>

        {/* Content Library link */}
        <Link
          href="/pedagogy/content-library"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                     border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
            />
          </svg>
          Content Library
        </Link>
      </div>

      {/* Existing instances */}
      {instances.length > 0 && (
        <div className="space-y-[var(--density-md)]">
          <h2 className="text-lg font-semibold text-foreground">
            Your Curricula
          </h2>
          <div className="grid gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <Link
                key={instance.id}
                href={`/pedagogy/curriculum/${instance.id}`}
                className="card-interactive block rounded-lg border border-border bg-card p-[var(--density-card-padding)]"
              >
                <h3 className="text-sm font-semibold text-foreground">
                  {instance.name}
                </h3>
                {instance.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {instance.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="status-badge"
                    style={
                      {
                        "--badge-bg": instance.is_active
                          ? "var(--success)"
                          : "var(--muted)",
                        "--badge-fg": instance.is_active
                          ? "var(--success-foreground)"
                          : "var(--muted-foreground)",
                      } as React.CSSProperties
                    }
                  >
                    {instance.is_active ? "Active" : "Inactive"}
                  </span>

                  {instance.source_template_id && (
                    <span
                      className="status-badge status-badge-plain"
                      style={
                        {
                          "--badge-bg": "var(--curriculum-activity-bg)",
                          "--badge-fg": "var(--curriculum-activity-fg)",
                        } as React.CSSProperties
                      }
                    >
                      From Template
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content Library banner - visible when no instances yet, or when there are templates to browse */}
      {canManage && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
          <div className="p-2 rounded-md bg-primary/10">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Explore the Content Library
            </p>
            <p className="text-xs text-muted-foreground">
              Browse AMI, EYLF, ACARA, and QCAA templates. Search by material,
              view cross-framework mappings, and generate compliance reports.
            </p>
          </div>
          <Link
            href="/pedagogy/content-library"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                       bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse Library
          </Link>
        </div>
      )}

      {/* Fork from template or create blank */}
      {canManage && (
        <div className="space-y-[var(--density-md)]">
          <div className="border-t border-border pt-[var(--density-xl)]">
            <h2 className="text-lg font-semibold text-foreground">
              {instances.length > 0 ? "Add Another Curriculum" : "Get Started"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {instances.length > 0
                ? "Fork from a standard framework or start from scratch."
                : "Choose a Montessori curriculum framework to get started instantly, or build your own from scratch."}
            </p>
          </div>

          {templates.length > 0 && (
            <div className="grid gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={
                    {
                      backgroundColor: "var(--curriculum-activity-bg)",
                      borderColor: "var(--curriculum-activity)",
                    } as React.CSSProperties
                  }
                  className="rounded-lg border border-dashed p-[var(--density-card-padding)] animate-scale-in"
                >
                  <h3
                    className="text-sm font-semibold"
                    style={
                      {
                        color: "var(--curriculum-activity-fg)",
                      } as React.CSSProperties
                    }
                  >
                    {template.name}
                  </h3>
                  <p
                    className="mt-1 text-xs opacity-80"
                    style={
                      {
                        color: "var(--curriculum-activity-fg)",
                      } as React.CSSProperties
                    }
                  >
                    {template.framework} &middot; Ages {template.age_range}
                  </p>
                  {template.description && (
                    <p
                      className="mt-2 line-clamp-2 text-xs opacity-70"
                      style={
                        {
                          color: "var(--curriculum-activity-fg)",
                        } as React.CSSProperties
                      }
                    >
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
              <div className="rounded-lg border border-dashed border-border bg-card p-[var(--density-card-padding)] animate-scale-in stagger-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Start from Scratch
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
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
        <div className="rounded-xl border border-border bg-card p-12 text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <span className="text-xl text-[var(--empty-state-icon)]">?</span>
          </div>
          <p className="text-sm text-[var(--empty-state-fg)] max-w-sm mx-auto">
            No curriculum has been set up yet. Ask your school administrator to
            configure one.
          </p>
        </div>
      )}
    </div>
  );
}
