// src/app/(app)/(app)/pedagogy/content-library/materials/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Material Search Page
// ============================================================
// "Which outcomes use the Pink Tower?" - the most common
// question Montessori guides ask when lesson planning.
//
// WHY a dedicated page: Material search is a primary workflow
// distinct from template browsing. Guides use it daily to plan
// lessons around available materials.
//
// FIX: Removed window.location usage - this is a Server Component.
// The search query is passed from searchParams instead.
// ============================================================

import { MaterialSearchInput } from "@/components/domain/curriculum-content/material-search-input";
import {
  searchNodesByMaterial,
  type MaterialSearchResult,
} from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface MaterialsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function MaterialsPage({
  params,
  searchParams,
}: MaterialsPageProps) {
  const { tenant } = await params;
  const { q } = await searchParams;

  let results: MaterialSearchResult[] = [];
  let error: string | null = null;

  if (q && q.trim().length > 0) {
    const response = await searchNodesByMaterial(q.trim(), { limit: 50 });
    if (response.error) {
      error = response.error.message;
    } else {
      results = response.data ?? [];
    }
  }

  // Lowercase query for case-insensitive material highlighting
  const queryLower = (q ?? "").toLowerCase();

  // Group results by template/instance for clearer display
  const grouped = groupResults(results);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="max-w-xl">
        <MaterialSearchInput initialQuery={q ?? ""} />
        <p className="text-xs text-muted-foreground mt-2">
          Search for a Montessori material to find all curriculum outcomes that
          use it. Try &quot;Pink Tower&quot;, &quot;Sandpaper Letters&quot;, or
          &quot;Golden Beads&quot;.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {q && !error && (
        <div className="space-y-6">
          {/* Summary */}
          <p className="text-sm text-muted-foreground">
            {results.length} outcome{results.length !== 1 ? "s" : ""} found for
            &quot;<span className="font-medium text-foreground">{q}</span>&quot;
          </p>

          {results.length === 0 && q.trim().length > 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="text-sm font-medium mb-1">No outcomes found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No curriculum outcomes reference &quot;{q}&quot; in their
                materials list. Try a different material name or a broader
                search term.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <MaterialResultGroup
                  key={group.key}
                  group={group}
                  tenant={tenant}
                  queryLower={queryLower}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State - no search yet */}
      {!q && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="text-4xl mb-3">🧱</div>
          <h3 className="text-lg font-medium mb-1">Search by Material</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter a Montessori material name above to discover which curriculum
            outcomes reference it. Great for lesson planning and material
            audits.
          </p>

          {/* Popular material suggestions */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {POPULAR_MATERIALS.map((material) => (
              <Link
                key={material}
                href={`/pedagogy/content-library/materials?q=${encodeURIComponent(material)}`}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-border
                           hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {material}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Constants
// ============================================================

const POPULAR_MATERIALS = [
  "Pink Tower",
  "Brown Stair",
  "Red Rods",
  "Sandpaper Letters",
  "Golden Beads",
  "Moveable Alphabet",
  "Binomial Cube",
  "Knobbed Cylinders",
  "Stamp Game",
  "Bead Frame",
  "Metal Insets",
  "Continent Globe",
];

// ============================================================
// Grouping Logic
// ============================================================

interface ResultGroup {
  key: string;
  label: string;
  framework: string | null;
  sublabel: string | null;
  results: MaterialSearchResult[];
}

function groupResults(results: MaterialSearchResult[]): ResultGroup[] {
  const map = new Map<string, MaterialSearchResult[]>();

  for (const r of results) {
    const key = r.instance_id
      ? `instance:${r.instance_id}`
      : `template:${r.template_id}`;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([key, groupResults]) => {
    const first = groupResults[0];
    const isInstance = key.startsWith("instance:");

    return {
      key,
      label: isInstance
        ? (first.instance_name ?? "School Curriculum")
        : (first.template_name ?? "Template"),
      framework: first.framework,
      sublabel: isInstance ? "Your school's curriculum" : "Global template",
      results: groupResults,
    };
  });
}

// ============================================================
// Sub-components
// ============================================================

function MaterialResultGroup({
  group,
  tenant,
  queryLower,
}: {
  group: ResultGroup;
  tenant: string;
  queryLower: string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Group Header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
        {group.framework && <FrameworkDot framework={group.framework} />}
        <div>
          <h3 className="text-sm font-medium">{group.label}</h3>
          {group.sublabel && (
            <p className="text-xs text-muted-foreground">{group.sublabel}</p>
          )}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {group.results.length} outcome{group.results.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Result Rows */}
      <div className="divide-y divide-border">
        {group.results.map((result) => (
          <Link
            key={result.node_id}
            href={`/pedagogy/content-library/node/${result.node_id}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            {/* Level indicator */}
            <LevelBadge level={result.node_level} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {result.node_title}
                </span>
                {result.node_code && (
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                    {result.node_code}
                  </code>
                )}
              </div>

              {/* Show all materials with the matched one highlighted */}
              <div className="flex flex-wrap gap-1 mt-1">
                {result.materials.map((mat, i) => {
                  const isMatch =
                    queryLower.length > 0 &&
                    mat.toLowerCase().includes(queryLower);
                  return (
                    <span
                      key={i}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        isMatch
                          ? "bg-primary/10 text-primary font-medium"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {mat}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Arrow */}
            <svg
              className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0"
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
          </Link>
        ))}
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    area: "bg-[var(--curriculum-area-bg,hsl(38,30%,85%))] text-amber-800 dark:text-amber-300",
    strand:
      "bg-[var(--curriculum-strand-bg,hsl(152,18%,85%))] text-emerald-800 dark:text-emerald-300",
    outcome:
      "bg-[var(--curriculum-outcome-bg,hsl(210,22%,85%))] text-blue-800 dark:text-blue-300",
    activity:
      "bg-[var(--curriculum-activity-bg,hsl(270,15%,85%))] text-purple-800 dark:text-purple-300",
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center w-16 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider shrink-0
        ${styles[level] ?? "bg-muted text-muted-foreground"}
      `}
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
      className={`w-2 h-2 rounded-full shrink-0 ${colorMap[framework] ?? "bg-gray-400"}`}
      aria-hidden="true"
    />
  );
}
