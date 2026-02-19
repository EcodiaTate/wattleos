// src/app/(app)/[tenant]/pedagogy/content-library/node/[nodeId]/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Enriched Node Detail
// ============================================================
// The deep-dive view for a single curriculum outcome. Shows all
// Module 14 enrichment fields: materials, direct/indirect aims,
// assessment criteria, prerequisites, and cross-framework mappings.
//
// WHY its own page: This is where guides spend time when lesson
// planning. They need to see "what materials do I need, what
// are the aims, what does this map to in EYLF/ACARA, and what
// should the child have mastered first?"
// ============================================================

import { NodeEnrichmentEditor } from "@/components/domain/curriculum-content/node-enrichment-editor";
import {
  getEnrichedNode,
  getPrerequisiteChain,
  resolveLinkedOutcomes,
  type LinkedOutcome,
} from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface NodeDetailPageProps {
  params: Promise<{ tenant: string; nodeId: string }>;
}

export default async function NodeDetailPage({ params }: NodeDetailPageProps) {
  const { tenant, nodeId } = await params;

  // Fetch node details
  const nodeResult = await getEnrichedNode(nodeId);

  if (nodeResult.error || !nodeResult.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <h2 className="text-lg font-medium text-destructive mb-1">
          Node not found
        </h2>
        <p className="text-sm text-muted-foreground">
          {nodeResult.error?.message ??
            "The requested curriculum node could not be loaded."}
        </p>
        <Link
          href={`/${tenant}/pedagogy/content-library`}
          className="inline-block mt-4 text-sm text-primary hover:underline"
        >
          Back to Content Library
        </Link>
      </div>
    );
  }

  const node = nodeResult.data;

  // Parallel fetch: cross-mappings + prerequisites
  const [linkedResult, prereqResult] = await Promise.all([
    resolveLinkedOutcomes(nodeId),
    node.instance_id && node.prerequisites && node.prerequisites.length > 0
      ? getPrerequisiteChain(node.instance_id, nodeId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const linkedOutcomes = linkedResult.data?.outcomes ?? [];
  const prerequisites = prereqResult.data ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href={`/${tenant}/pedagogy/content-library`}
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
            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {node.code}
            </code>
          )}
          {node.age_range && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Ages {node.age_range}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{node.title}</h1>
        {node.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {node.description}
          </p>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Primary info (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Materials */}
          <InfoSection
            title="Materials"
            icon={<CubeIcon />}
            isEmpty={!node.materials || node.materials.length === 0}
            emptyText="No materials listed for this outcome."
          >
            <div className="flex flex-wrap gap-2">
              {node.materials?.map((mat, i) => (
                <Link
                  key={i}
                  href={`/${tenant}/pedagogy/content-library/materials?q=${encodeURIComponent(mat)}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm
                             bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300
                             hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                >
                  🧱 {mat}
                </Link>
              ))}
            </div>
          </InfoSection>

          {/* Direct Aims */}
          <InfoSection
            title="Direct Aims"
            icon={<TargetIcon />}
            isEmpty={!node.direct_aims || node.direct_aims.length === 0}
            emptyText="No direct aims listed."
          >
            <ul className="space-y-1">
              {node.direct_aims?.map((aim, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5 shrink-0">●</span>
                  {aim}
                </li>
              ))}
            </ul>
          </InfoSection>

          {/* Indirect Aims */}
          <InfoSection
            title="Indirect Aims"
            icon={<SparklesIcon />}
            isEmpty={!node.indirect_aims || node.indirect_aims.length === 0}
            emptyText="No indirect aims listed."
          >
            <ul className="space-y-1">
              {node.indirect_aims?.map((aim, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-muted-foreground/50 mt-0.5 shrink-0">
                    ○
                  </span>
                  {aim}
                </li>
              ))}
            </ul>
          </InfoSection>

          {/* Assessment Criteria (QCAA senior) */}
          {node.assessment_criteria && (
            <InfoSection title="Assessment Criteria" icon={<ClipboardIcon />}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {node.assessment_criteria}
              </p>
            </InfoSection>
          )}

          {/* Content URL */}
          {node.content_url && (
            <InfoSection title="Reference Material" icon={<LinkIcon />}>
              <a
                href={node.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {node.content_url}
              </a>
            </InfoSection>
          )}
        </div>

        {/* Right column: Cross-mappings + Prerequisites (1/3 width) */}
        <div className="space-y-6">
          {/* Cross-Framework Mappings */}
          <div className="rounded-lg border border-border">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MappingIcon />
                Cross-Framework Links
              </h3>
            </div>
            <div className="p-4">
              {linkedOutcomes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No cross-framework mappings found for this outcome.
                </p>
              ) : (
                <div className="space-y-3">
                  {linkedOutcomes.map((linked) => (
                    <LinkedOutcomeCard
                      key={linked.node_id}
                      outcome={linked}
                      tenant={tenant}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prerequisites */}
          <div className="rounded-lg border border-border">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <PrereqIcon />
                Prerequisites
              </h3>
            </div>
            <div className="p-4">
              {prerequisites.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No prerequisites defined for this outcome.
                </p>
              ) : (
                <div className="space-y-2">
                  {prerequisites.map((prereq, i) => (
                    <Link
                      key={prereq.id}
                      href={`/${tenant}/pedagogy/content-library/node/${prereq.id}`}
                      className="flex items-start gap-2 text-sm hover:text-primary transition-colors group"
                    >
                      <span className="text-muted-foreground text-xs mt-0.5 font-mono shrink-0">
                        {i + 1}.
                      </span>
                      <span className="group-hover:underline">
                        {prereq.title}
                      </span>
                      {prereq.code && (
                        <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded font-mono shrink-0">
                          {prereq.code}
                        </code>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enrichment Editor (client component - only for authorized users) */}
      <div className="border-t border-border pt-6">
        <NodeEnrichmentEditor node={node} />
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function LinkedOutcomeCard({
  outcome,
  tenant,
}: {
  outcome: LinkedOutcome;
  tenant: string;
}) {
  const mappingColors: Record<string, string> = {
    aligned: "border-l-emerald-500",
    partially_aligned: "border-l-amber-500",
    prerequisite: "border-l-blue-500",
    extends: "border-l-purple-500",
  };

  return (
    <Link
      href={`/${tenant}/pedagogy/content-library/node/${outcome.node_id}`}
      className={`
        block rounded border border-border border-l-2 px-3 py-2
        hover:bg-muted/30 transition-colors
        ${mappingColors[outcome.mapping_type] ?? "border-l-gray-400"}
      `}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {outcome.framework && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {outcome.framework}
          </span>
        )}
        {outcome.code && (
          <code className="text-[10px] font-mono text-muted-foreground">
            {outcome.code}
          </code>
        )}
      </div>
      <p className="text-xs leading-snug">{outcome.title}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-muted-foreground capitalize">
          {outcome.mapping_type.replace("_", " ")}
        </span>
        <span className="text-[10px] text-muted-foreground">
          · {outcome.confidence}
        </span>
      </div>
    </Link>
  );
}

function InfoSection({
  title,
  icon,
  children,
  isEmpty = false,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyText?: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium flex items-center gap-2 mb-3">
        {icon}
        {title}
      </h2>
      {isEmpty ? (
        <p className="text-xs text-muted-foreground italic">{emptyText}</p>
      ) : (
        children
      )}
    </section>
  );
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    area: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    strand:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    outcome: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    activity:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  };

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider
        ${styles[level] ?? "bg-muted text-muted-foreground"}
      `}
    >
      {level}
    </span>
  );
}

// ============================================================
// Icons (inline SVGs to avoid dependency bloat)
// ============================================================

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

function CubeIcon() {
  return (
    <svg
      className="w-4 h-4 text-amber-600 dark:text-amber-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      className="w-4 h-4 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      className="w-4 h-4 text-purple-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      className="w-4 h-4 text-rose-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.928 0a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L7.757 8.688"
      />
    </svg>
  );
}

function MappingIcon() {
  return (
    <svg
      className="w-4 h-4 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function PrereqIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}
