// src/app/(app)/(app)/pedagogy/content-library/cross-mappings/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Cross-Mappings Browser
// ============================================================
// Shows all cross-framework links between curriculum templates.
// Users can filter by source/target template to see, e.g., all
// AMI 3-6 → EYLF mappings in one view.
//
// WHY this page: Cross-mappings are the bridge that lets
// Montessori schools demonstrate compliance. "AMI Carrying a
// Chair → EYLF Outcome 3.2" is exactly what NQS assessors need.
// ============================================================

import { CrossMappingFilters } from "@/components/domain/curriculum-content/cross-mapping-filters";
import {
  listCrossMappings,
  listCrossMappingsBetweenTemplates,
  listTemplatesFiltered,
  type CrossMappingWithDetails,
  type EnhancedCurriculumTemplate,
} from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface CrossMappingsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    source?: string;
    target?: string;
    type?: string;
  }>;
}

export default async function CrossMappingsPage({
  params,
  searchParams,
}: CrossMappingsPageProps) {
  const { tenant } = await params;
  const sp = await searchParams;

  // Fetch all templates for the filter dropdowns
  const templatesResult = await listTemplatesFiltered({});
  const templates = templatesResult.data ?? [];

  // Fetch cross-mappings based on filters
  let mappings: CrossMappingWithDetails[] = [];
  let error: string | null = null;

  if (sp.source && sp.target) {
    // Filtered view: mappings between two specific templates
    const result = await listCrossMappingsBetweenTemplates(
      sp.source,
      sp.target,
    );
    if (result.error) {
      error = result.error.message;
    } else {
      mappings = result.data ?? [];
    }
  } else if (sp.source || sp.target) {
    // Partial filter: show all mappings for one template
    const filter: {
      source_template_id?: string;
      target_template_id?: string;
      mapping_type?: string;
    } = {};
    if (sp.source) filter.source_template_id = sp.source;
    if (sp.target) filter.target_template_id = sp.target;
    if (sp.type) filter.mapping_type = sp.type;

    const result = await listCrossMappings(filter);
    if (result.error) {
      error = result.error.message;
    } else {
      mappings = result.data ?? [];
    }
  }

  // Filter by mapping type client-side if both source and target were set
  if (sp.type && mappings.length > 0) {
    mappings = mappings.filter((m) => m.mapping_type === sp.type);
  }

  // Identify source and target template names for display
  const sourceTemplate = templates.find((t) => t.id === sp.source);
  const targetTemplate = templates.find((t) => t.id === sp.target);

  const hasFilters = !!(sp.source || sp.target);

  return (
    <div className="space-y-6">
      {/* Template Pair Selector */}
      <CrossMappingFilters
        templates={templates}
        currentSource={sp.source ?? ""}
        currentTarget={sp.target ?? ""}
        currentType={sp.type ?? ""}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {hasFilters ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {mappings.length} mapping{mappings.length !== 1 ? "s" : ""}{" "}
                found
                {sourceTemplate && targetTemplate && (
                  <>
                    {" "}
                    between{" "}
                    <span className="font-medium text-foreground">
                      {sourceTemplate.name}
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-foreground">
                      {targetTemplate.name}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Mapping Table */}
          {mappings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="text-sm font-medium mb-1">
                No cross-mappings found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No outcome-to-outcome links exist between these frameworks yet.
                Cross-mappings can be added during template import or manually
                by curriculum managers.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-2 px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
                <span>Source Outcome</span>
                <span className="w-6" />
                <span>Target Outcome</span>
                <span className="w-24 text-center">Type</span>
                <span className="w-20 text-center">Confidence</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {mappings.map((mapping) => (
                  <CrossMappingRow
                    key={mapping.id}
                    mapping={mapping}
                    tenant={tenant}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* No filters selected - show instructions */
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="text-4xl mb-3">🔗</div>
          <h3 className="text-lg font-medium mb-1">
            Browse Cross-Framework Mappings
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select a source and target framework above to see how their outcomes
            are linked. These mappings power automatic compliance tagging and
            regulatory reporting.
          </p>

          {/* Quick-access pairs */}
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Common mapping pairs:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {getCommonPairs(templates).map(([source, target]) => (
                <Link
                  key={`${source.id}-${target.id}`}
                  href={`/pedagogy/content-library/cross-mappings?source=${source.id}&target=${target.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                             border border-border hover:bg-accent transition-colors"
                >
                  <FrameworkDot framework={source.framework ?? ""} />
                  {source.framework}
                  <span className="text-muted-foreground">→</span>
                  <FrameworkDot framework={target.framework ?? ""} />
                  {target.framework}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function CrossMappingRow({
  mapping,
  tenant,
}: {
  mapping: CrossMappingWithDetails;
  tenant: string;
}) {
  const typeColors: Record<string, string> = {
    aligned:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    partially_aligned:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    prerequisite:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    extends:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  };

  const confidenceColors: Record<string, string> = {
    verified: "text-emerald-600 dark:text-emerald-400",
    suggested: "text-amber-600 dark:text-amber-400",
    community: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-2 px-4 py-3 items-center hover:bg-muted/10">
      {/* Source */}
      <Link
        href={`/pedagogy/content-library/node/${mapping.source_node.id}`}
        className="text-sm hover:text-primary transition-colors truncate"
      >
        <span className="font-medium">{mapping.source_node.title}</span>
        {mapping.source_node.code && (
          <code className="ml-1.5 text-[10px] text-muted-foreground font-mono">
            {mapping.source_node.code}
          </code>
        )}
      </Link>

      {/* Arrow */}
      <span className="text-muted-foreground">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </span>

      {/* Target */}
      <Link
        href={`/pedagogy/content-library/node/${mapping.target_node.id}`}
        className="text-sm hover:text-primary transition-colors truncate"
      >
        <span className="font-medium">{mapping.target_node.title}</span>
        {mapping.target_node.code && (
          <code className="ml-1.5 text-[10px] text-muted-foreground font-mono">
            {mapping.target_node.code}
          </code>
        )}
      </Link>

      {/* Type */}
      <span
        className={`w-24 text-center inline-flex justify-center items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize
                    ${typeColors[mapping.mapping_type] ?? "bg-muted text-muted-foreground"}`}
      >
        {mapping.mapping_type.replace("_", " ")}
      </span>

      {/* Confidence */}
      <span
        className={`w-20 text-center text-[10px] font-medium capitalize
                    ${confidenceColors[mapping.confidence] ?? "text-muted-foreground"}`}
      >
        {mapping.confidence}
      </span>
    </div>
  );
}

function FrameworkDot({ framework }: { framework: string }) {
  const colorMap: Record<string, string> = {
    AMI: "bg-amber-500",
    AMS: "bg-blue-500",
    EYLF: "bg-emerald-500",
    ACARA: "bg-purple-500",
    QCAA: "bg-rose-500",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${colorMap[framework] ?? "bg-gray-400"}`}
    />
  );
}

/** Get common framework pairs for quick-access links */
function getCommonPairs(
  templates: EnhancedCurriculumTemplate[],
): [EnhancedCurriculumTemplate, EnhancedCurriculumTemplate][] {
  const pairs: [EnhancedCurriculumTemplate, EnhancedCurriculumTemplate][] = [];
  const pedagogical = templates.filter((t) => !t.is_compliance_framework);
  const compliance = templates.filter((t) => t.is_compliance_framework);

  // Pair each pedagogical framework with each compliance framework
  for (const ped of pedagogical.slice(0, 3)) {
    for (const comp of compliance.slice(0, 2)) {
      pairs.push([ped, comp]);
    }
  }

  return pairs.slice(0, 4); // Max 4 suggestions
}
