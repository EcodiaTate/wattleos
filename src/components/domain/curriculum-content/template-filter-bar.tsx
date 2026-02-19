// src/components/domain/curriculum-content/template-filter-bar.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Template Filter Bar
// ============================================================
// Client component that manages filter state and pushes changes
// to URL searchParams. The parent Server Component re-fetches
// with the new filter.
//
// WHY 'use client': We need onChange handlers on select elements
// and a debounced text input for search. The actual data fetching
// stays on the server via URL-driven re-render.
// ============================================================

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

interface FilterState {
  framework: string;
  age_range: string;
  country: string;
  compliance: string;
  search: string;
}

interface TemplateFilterBarProps {
  frameworks: string[];
  ageRanges: string[];
  currentFilter: FilterState;
}

export function TemplateFilterBar({
  frameworks,
  ageRanges,
  currentFilter,
}: TemplateFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentFilter.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push filter changes to URL
  const updateFilter = useCallback(
    (key: keyof FilterState, value: string) => {
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

  // Debounced search input
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        updateFilter("search", value);
      }, 300);
    },
    [updateFilter],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Clear all filters
  const clearAll = useCallback(() => {
    setSearchValue("");
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const hasFilters =
    currentFilter.framework ||
    currentFilter.age_range ||
    currentFilter.country ||
    currentFilter.compliance ||
    currentFilter.search;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="template-search"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Search
          </label>
          <input
            id="template-search"
            type="text"
            placeholder="Search templates by name..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2
                       focus:ring-ring focus:ring-offset-2"
          />
        </div>

        {/* Framework Filter */}
        <div className="min-w-[140px]">
          <label
            htmlFor="filter-framework"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Framework
          </label>
          <select
            id="filter-framework"
            value={currentFilter.framework}
            onChange={(e) => updateFilter("framework", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">All frameworks</option>
            {frameworks.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Age Range Filter */}
        <div className="min-w-[130px]">
          <label
            htmlFor="filter-age"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Age Range
          </label>
          <select
            id="filter-age"
            value={currentFilter.age_range}
            onChange={(e) => updateFilter("age_range", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">All ages</option>
            {ageRanges.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Compliance Filter */}
        <div className="min-w-[150px]">
          <label
            htmlFor="filter-compliance"
            className="text-xs font-medium text-muted-foreground mb-1 block"
          >
            Type
          </label>
          <select
            id="filter-compliance"
            value={currentFilter.compliance}
            onChange={(e) => updateFilter("compliance", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">All types</option>
            <option value="true">Compliance frameworks</option>
            <option value="false">Pedagogical frameworks</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground
                       transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="h-0.5 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary rounded animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}
