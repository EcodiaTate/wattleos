// src/components/domain/programs/program-list-filters.tsx
"use client";

import { PROGRAM_TYPES } from "@/lib/constants/programs";
import { useRouter, useSearchParams } from "next/navigation";

interface ProgramListFiltersProps {
  currentType?: string;
  currentActive?: boolean;
}

export function ProgramListFilters({
  currentType,
  currentActive,
}: ProgramListFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/programs?${params.toString()}`);
  }

  const selectCls = "rounded-lg border border-input bg-card px-3 h-[var(--density-input-height)] text-sm font-medium text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-[var(--transition-fast)] shadow-sm";

  return (
    <div className="flex flex-wrap items-center gap-[var(--density-sm)]">
      <select
        value={currentType ?? ""}
        onChange={(e) => updateFilter("type", e.target.value || undefined)}
        className={selectCls}
      >
        <option value="">All Program Types</option>
        {PROGRAM_TYPES.map((pt) => (
          <option key={pt.value} value={pt.value}>{pt.label}</option>
        ))}
      </select>

      <select
        value={currentActive === undefined ? "" : String(currentActive)}
        onChange={(e) => updateFilter("active", e.target.value || undefined)}
        className={selectCls}
      >
        <option value="">All Statuses</option>
        <option value="true">Active Only</option>
        <option value="false">Inactive Only</option>
      </select>

      {(currentType || currentActive !== undefined) && (
        <button
          onClick={() => router.push("/programs")}
          className="text-sm font-bold text-primary hover:text-primary-600 transition-colors px-2 py-1"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}