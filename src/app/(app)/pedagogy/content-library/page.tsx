// src/app/(app)/(app)/pedagogy/content-library/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Content Library - Template Browser
// ============================================================
// Server Component that fetches templates with filters from
// searchParams. The TemplateFilterBar (client) updates the URL
// params; this page re-renders with the new filter.
//
// WHY searchParams instead of client state: keeps the filtered
// view shareable via URL, works with browser back/forward, and
// lets the heavy data fetch happen on the server.
// ============================================================

import { TemplateCard } from "@/components/domain/curriculum-content/template-card";
import { TemplateFilterBar } from "@/components/domain/curriculum-content/template-filter-bar";
import {
  listAvailableAgeRanges,
  listAvailableFrameworks,
  listTemplatesFiltered,
  type EnhancedCurriculumTemplate,
  type TemplateFilter,
} from "@/lib/actions/curriculum-content";
import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";

interface ContentLibraryPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    framework?: string;
    age_range?: string;
    country?: string;
    compliance?: string;
    search?: string;
  }>;
}

export default async function ContentLibraryPage({
  params,
  searchParams,
}: ContentLibraryPageProps) {
  const { tenant } = await params;
  const sp = await searchParams;

  // Check if user can import templates (for showing the import CTA)
  const context = await getTenantContext();
  const canImport = context.permissions.includes(
    "manage_curriculum_templates",
  );

  // Build filter from URL search params
  const filter: TemplateFilter = {};
  if (sp.framework) filter.framework = sp.framework;
  if (sp.age_range) filter.age_range = sp.age_range;
  if (sp.country) filter.country = sp.country;
  if (sp.compliance === "true") filter.is_compliance_framework = true;
  if (sp.compliance === "false") filter.is_compliance_framework = false;
  if (sp.search) filter.search = sp.search;

  // Parallel fetch: templates + filter options
  const [templatesResult, frameworksResult, ageRangesResult] =
    await Promise.all([
      listTemplatesFiltered(filter),
      listAvailableFrameworks(),
      listAvailableAgeRanges(),
    ]);

  const templates = templatesResult.data ?? [];
  const frameworks = frameworksResult.data ?? [];
  const ageRanges = ageRangesResult.data ?? [];

  // Group templates by framework for visual organization
  const grouped = groupByFramework(templates);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <TemplateFilterBar
        frameworks={frameworks}
        ageRanges={ageRanges}
        currentFilter={{
          framework: sp.framework ?? "",
          age_range: sp.age_range ?? "",
          country: sp.country ?? "",
          compliance: sp.compliance ?? "",
          search: sp.search ?? "",
        }}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""} found
          {hasActiveFilters(sp) ? " (filtered)" : ""}
        </p>

        {canImport && (
          <Link
            href="/pedagogy/content-library/import"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                       bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            Import Template
          </Link>
        )}
      </div>

      {/* Template Grid - grouped by framework */}
      {templates.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters(sp)} canImport={canImport} />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ framework, templates: groupTemplates }) => (
            <section key={framework}>
              <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
                <FrameworkBadge framework={framework} />
                {framework}
                <span className="text-sm font-normal text-muted-foreground">
                  ({groupTemplates.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    tenant={tenant}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function hasActiveFilters(sp: Record<string, string | undefined>): boolean {
  return !!(
    sp.framework ||
    sp.age_range ||
    sp.country ||
    sp.compliance ||
    sp.search
  );
}

interface FrameworkGroup {
  framework: string;
  templates: EnhancedCurriculumTemplate[];
}

function groupByFramework(
  templates: EnhancedCurriculumTemplate[],
): FrameworkGroup[] {
  const map = new Map<string, EnhancedCurriculumTemplate[]>();

  for (const t of templates) {
    const key = t.framework ?? "Other";
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  // Sort framework groups: AMI first, then alphabetical, "Other" last
  const entries = Array.from(map.entries());
  entries.sort(([a], [b]) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    if (a === "AMI") return -1;
    if (b === "AMI") return 1;
    return a.localeCompare(b);
  });

  return entries.map(([framework, templates]) => ({ framework, templates }));
}

// ============================================================
// Sub-components
// ============================================================

function EmptyState({
  hasFilters,
  canImport,
}: {
  hasFilters: boolean;
  canImport: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <div className="text-4xl mb-3">📚</div>
      <h3 className="text-lg font-medium mb-1">
        {hasFilters
          ? "No templates match your filters"
          : "No templates available"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {hasFilters
          ? "Try adjusting or clearing your filters to see more results."
          : "Curriculum templates haven't been imported yet. An administrator can import JSON templates to populate the library."}
      </p>

      {!hasFilters && canImport && (
        <Link
          href="/pedagogy/content-library/import"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md text-sm font-medium
                     bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Import Your First Template
        </Link>
      )}
    </div>
  );
}

/** Color-coded dot for each framework family */
function FrameworkBadge({ framework }: { framework: string }) {
  const colorMap: Record<string, string> = {
    AMI: "bg-amber-500",
    AMS: "bg-blue-500",
    EYLF: "bg-emerald-500",
    ACARA: "bg-purple-500",
    QCAA: "bg-rose-500",
  };

  const color = colorMap[framework] ?? "bg-gray-400";

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${color}`}
      aria-hidden="true"
    />
  );
}
