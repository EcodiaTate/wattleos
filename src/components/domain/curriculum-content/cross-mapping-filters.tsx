// src/components/domain/curriculum-content/cross-mapping-filters.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Cross-Mapping Filters
// ============================================================
// Client component for selecting source and target templates
// when browsing cross-framework mappings.
//
// WHY 'use client': Dropdown onChange handlers that push to URL.
// ============================================================

"use client";

import type { EnhancedCurriculumTemplate } from "@/lib/actions/curriculum-content";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface CrossMappingFiltersProps {
  templates: EnhancedCurriculumTemplate[];
  currentSource: string;
  currentTarget: string;
  currentType: string;
}

const MAPPING_TYPES = [
  { value: "", label: "All types" },
  { value: "aligned", label: "Aligned" },
  { value: "partially_aligned", label: "Partially aligned" },
  { value: "prerequisite", label: "Prerequisite" },
  { value: "extends", label: "Extends" },
];

export function CrossMappingFilters({
  templates,
  currentSource,
  currentTarget,
  currentType,
}: CrossMappingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  // Group templates by framework for the dropdowns
  const pedagogical = templates.filter((t) => !t.is_compliance_framework);
  const compliance = templates.filter((t) => t.is_compliance_framework);

  const hasFilters = !!(currentSource || currentTarget || currentType);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Source Template */}
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="mapping-source"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Source Framework
          </label>
          <select
            id="mapping-source"
            value={currentSource}
            onChange={(e) => updateParam("source", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select source...</option>
            {pedagogical.length > 0 && (
              <optgroup label="Pedagogical">
                {pedagogical.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.framework ? `[${t.framework}] ` : ""}
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
            {compliance.length > 0 && (
              <optgroup label="Compliance">
                {compliance.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.framework ? `[${t.framework}] ` : ""}
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Arrow indicator */}
        <div className="flex items-center justify-center h-9 px-2 text-muted-foreground">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
        </div>

        {/* Target Template */}
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="mapping-target"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Target Framework
          </label>
          <select
            id="mapping-target"
            value={currentTarget}
            onChange={(e) => updateParam("target", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select target...</option>
            {compliance.length > 0 && (
              <optgroup label="Compliance">
                {compliance.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.framework ? `[${t.framework}] ` : ""}
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
            {pedagogical.length > 0 && (
              <optgroup label="Pedagogical">
                {pedagogical.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.framework ? `[${t.framework}] ` : ""}
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Mapping Type */}
        <div className="min-w-[160px]">
          <label
            htmlFor="mapping-type"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Mapping Type
          </label>
          <select
            id="mapping-type"
            value={currentType}
            onChange={(e) => updateParam("type", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {MAPPING_TYPES.map((mt) => (
              <option key={mt.value} value={mt.value}>
                {mt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground
                       transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {isPending && (
        <div className="h-0.5 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary rounded animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}
