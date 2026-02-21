// src/components/domain/curriculum-content/template-filter-bar.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function TemplateFilterBar({ frameworks, ageRanges, currentFilter }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentFilter.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [router, pathname, searchParams]);

  const selectCls = "w-full h-[var(--density-input-height)] rounded-lg border border-input bg-card px-3 text-sm font-bold focus:ring-2 focus:ring-primary transition-all shadow-sm";

  return (
    <div className="space-y-[var(--density-md)]">
      <div className="flex flex-wrap items-end gap-[var(--density-md)] p-[var(--density-md)] bg-muted/30 rounded-xl border border-border">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Search Library</label>
          <input type="text" placeholder="Search templates..." value={searchValue} onChange={(e) => {
            setSearchValue(e.target.value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateFilter("search", e.target.value), 300);
          }} className={selectCls} />
        </div>

        <div className="min-w-[150px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Framework</label>
          <select value={currentFilter.framework} onChange={(e) => updateFilter("framework", e.target.value)} className={selectCls}>
            <option value="">All Systems</option>
            {frameworks.map((f: string) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="min-w-[150px]">
          <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Status</label>
          <select value={currentFilter.compliance} onChange={(e) => updateFilter("compliance", e.target.value)} className={selectCls}>
            <option value="">All Types</option>
            <option value="true">Compliance</option>
            <option value="false">Pedagogical</option>
          </select>
        </div>
      </div>

      {isPending && (
        <div className="h-1 bg-primary/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-shimmer w-full" />
        </div>
      )}
    </div>
  );
}