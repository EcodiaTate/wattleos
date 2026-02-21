// src/components/domain/curriculum-content/cross-mapping-filters.tsx
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

  const pedagogical = templates.filter((t) => !t.is_compliance_framework);
  const compliance = templates.filter((t) => t.is_compliance_framework);
  const hasFilters = !!(currentSource || currentTarget || currentType);

  const selectCls = "w-full h-[var(--density-input-height)] rounded-lg border border-input bg-card px-[var(--density-input-padding-x)] text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-[var(--transition-fast)] shadow-sm";

  return (
    <div className="space-y-[var(--density-sm)]">
      <div className="flex flex-wrap items-end gap-[var(--density-md)]">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="mapping-source" className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Source Framework</label>
          <select id="mapping-source" value={currentSource} onChange={(e) => updateParam("source", e.target.value)} className={selectCls}>
            <option value="">Select source...</option>
            {pedagogical.length > 0 && <optgroup label="Pedagogical">{pedagogical.map((t) => <option key={t.id} value={t.id}>[{t.framework}] {t.name}</option>)}</optgroup>}
            {compliance.length > 0 && <optgroup label="Compliance">{compliance.map((t) => <option key={t.id} value={t.id}>[{t.framework}] {t.name}</option>)}</optgroup>}
          </select>
        </div>

        <div className="flex items-center justify-center h-[var(--density-input-height)] px-2 text-primary font-bold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>

        <div className="min-w-[220px] flex-1">
          <label htmlFor="mapping-target" className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Target Framework</label>
          <select id="mapping-target" value={currentTarget} onChange={(e) => updateParam("target", e.target.value)} className={selectCls}>
            <option value="">Select target...</option>
            {compliance.length > 0 && <optgroup label="Compliance">{compliance.map((t) => <option key={t.id} value={t.id}>[{t.framework}] {t.name}</option>)}</optgroup>}
            {pedagogical.length > 0 && <optgroup label="Pedagogical">{pedagogical.map((t) => <option key={t.id} value={t.id}>[{t.framework}] {t.name}</option>)}</optgroup>}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label htmlFor="mapping-type" className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Mapping Type</label>
          <select id="mapping-type" value={currentType} onChange={(e) => updateParam("type", e.target.value)} className={selectCls}>
            {MAPPING_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
          </select>
        </div>

        {hasFilters && (
          <button onClick={clearAll} className="h-[var(--density-input-height)] px-3 text-sm font-bold text-primary hover:text-primary-700 transition-[var(--transition-fast)]">
            Clear
          </button>
        )}
      </div>

      {isPending && (
        <div className="h-1 bg-primary-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}