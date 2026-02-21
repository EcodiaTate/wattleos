// src/app/(app)/(app)/pedagogy/content-library/node/[nodeId]/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Enriched Node Detail
// ============================================================
// Deep view of a single curriculum node with all Module 14
// enrichment: materials, direct/indirect aims, prerequisites,
// assessment criteria, cross-mappings to other frameworks.
//
// WHY a standalone page: Guides and curriculum managers need to
// see the full picture of a curriculum outcome - what materials
// it uses, what skills it develops, what it connects to in
// compliance frameworks. This is the "lesson card" view.
// ============================================================

import { NodeEnrichmentEditor } from "@/components/domain/curriculum-content/node-enrichment-editor";
import {
  getEnrichedNode,
  listCrossMappingsForNode,
  type CrossMappingWithDetails,
  type EnhancedCurriculumNode,
} from "@/lib/actions/curriculum-content";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import Link from "next/link";

interface NodeDetailPageProps {
  params: Promise<{ tenant: string; nodeId: string }>;
}

export default async function NodeDetailPage({ params }: NodeDetailPageProps) {
  const { tenant, nodeId } = await params;

  // Fetch enriched node data
  const nodeResult = await getEnrichedNode(nodeId);

  if (nodeResult.error || !nodeResult.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <h2 className="text-lg font-medium text-destructive mb-1">
          Node not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The requested curriculum node could not be loaded.
        </p>
        <Link
          href="/pedagogy/content-library"
          className="inline-block mt-4 text-sm text-primary hover:underline"
        >
          Back to Content Library
        </Link>
      </div>
    );
  }

  const node = nodeResult.data;

  // Fetch cross-mappings for this node
  const crossMappingsResult = await listCrossMappingsForNode(nodeId);
  const crossMappings = crossMappingsResult.data ?? [];

  // Check if user can edit enrichment fields
  const context = await getTenantContext();
  const canEdit = context.permissions.includes("manage_curriculum");

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/pedagogy/content-library"
          className="hover:text-foreground transition-colors"
        >
          Content Library
        </Link>
        <ChevronRight />
        <span className="text-foreground font-medium truncate">
          {node.title}
        </span>
      </nav>

      {/* Node Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <LevelBadge level={node.level} />
          {node.code && (
            <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {node.code}
            </code>
          )}
          {node.age_range && (
            <span className="text-xs text-muted-foreground">
              Ages {node.age_range}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{node.title}</h1>
        {node.description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            {node.description}
          </p>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Materials */}
          <DetailSection title="Materials" icon="🧱">
            {node.materials && node.materials.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {node.materials.map((mat, i) => (
                  <Link
                    key={i}
                    href={`/pedagogy/content-library/materials?q=${encodeURIComponent(mat)}`}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                               bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300
                               hover:bg-amber-200 dark:hover:bg-amber-950/60 transition-colors"
                  >
                    {mat}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No materials listed
              </p>
            )}
          </DetailSection>

          {/* Direct Aims */}
          <DetailSection title="Direct Aims" icon="🎯">
            {node.direct_aims && node.direct_aims.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {node.direct_aims.map((aim, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                               bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                  >
                    {aim}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No direct aims listed
              </p>
            )}
          </DetailSection>

          {/* Indirect Aims */}
          <DetailSection title="Indirect Aims" icon="🌱">
            {node.indirect_aims && node.indirect_aims.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {node.indirect_aims.map((aim, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                               bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {aim}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No indirect aims listed
              </p>
            )}
          </DetailSection>

          {/* Assessment Criteria */}
          {node.assessment_criteria && (
            <DetailSection title="Assessment Criteria" icon="📋">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {node.assessment_criteria}
              </p>
            </DetailSection>
          )}

          {/* Prerequisites */}
          {node.prerequisites && node.prerequisites.length > 0 && (
            <DetailSection title="Prerequisites" icon="🔗">
              <p className="text-xs text-muted-foreground">
                {node.prerequisites.length} prerequisite
                {node.prerequisites.length !== 1 ? "s" : ""} - these outcomes
                should be mastered before presenting this work.
              </p>
            </DetailSection>
          )}

          {/* Content URL */}
          {node.content_url && (
            <DetailSection title="Resource Link" icon="📎">
              <a
                href={node.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {node.content_url}
              </a>
            </DetailSection>
          )}

          {/* Editor (inline, permission-gated) */}
          {canEdit && (
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                Edit Enrichment
              </h2>
              <NodeEnrichmentEditor
                nodeId={nodeId}
                initialData={{
                  code: node.code,
                  description: node.description,
                  materials: node.materials,
                  direct_aims: node.direct_aims,
                  indirect_aims: node.indirect_aims,
                  age_range: node.age_range,
                  prerequisites: node.prerequisites,
                  assessment_criteria: node.assessment_criteria,
                  content_url: node.content_url,
                }}
              />
            </div>
          )}
        </div>

        {/* Sidebar - right col */}
        <div className="space-y-6">
          {/* Cross-Mappings */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cross-Framework Mappings
              </h3>
            </div>

            {crossMappings.length > 0 ? (
              <div className="divide-y divide-border">
                {crossMappings.map((cm) => (
                  <CrossMappingItem key={cm.id} mapping={cm} nodeId={nodeId} />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  No cross-framework mappings for this outcome.
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Quick Actions
            </h3>
            {node.materials && node.materials.length > 0 && (
              <Link
                href={`/pedagogy/content-library/materials?q=${encodeURIComponent(node.materials[0])}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>🔍</span>
                Find other outcomes using {node.materials[0]}
              </Link>
            )}
            <Link
              href="/pedagogy/observations?create=1"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>📸</span>
              Create observation for this outcome
            </Link>
            <Link
              href="/pedagogy/mastery"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>📊</span>
              View mastery tracking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CrossMappingItem({
  mapping,
  nodeId,
}: {
  mapping: CrossMappingWithDetails;
  nodeId: string;
}) {
  // Determine which side is the "other" framework
  const isSource = mapping.source_node.id === nodeId;
  const otherNode = isSource ? mapping.target_node : mapping.source_node;
  const otherTemplate = isSource
    ? mapping.target_template
    : mapping.source_template;

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

  return (
    <Link
      href={`/pedagogy/content-library/node/${otherNode.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
    >
      <FrameworkDot framework={otherTemplate.framework ?? ""} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{otherNode.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {otherTemplate.framework ?? otherTemplate.name}
          </span>
          {otherNode.code && (
            <code className="text-[10px] font-mono text-muted-foreground">
              {otherNode.code}
            </code>
          )}
        </div>
      </div>
      <span
        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium capitalize
                    ${typeColors[mapping.mapping_type] ?? "bg-muted text-muted-foreground"}`}
      >
        {mapping.mapping_type.replace("_", " ")}
      </span>
    </Link>
  );
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    area: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    strand:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    outcome:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    activity:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${styles[level] ?? "bg-muted text-muted-foreground"}`}
    >
      {level}
    </span>
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
      className={`w-2 h-2 rounded-full shrink-0 mt-1 ${colorMap[framework] ?? "bg-gray-400"}`}
    />
  );
}

function ChevronRight() {
  return (
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
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
