// src/components/domain/programs/program-list-filters.tsx
//
// ============================================================
// WattleOS V2 - Program List Filter Bar
// ============================================================
// Client component that provides filter dropdowns for program
// type and active status. Uses URL search params for state
// so the server component can read them.
//
// WHY URL params: Keeps filter state in the URL for
// bookmarkability and server-side filtering (the query runs
// on the server with the filter applied, not post-fetch).
// ============================================================

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

    // Reset to page 1 when filters change
    params.delete("page");

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/programs?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Type filter */}
      <select
        value={currentType ?? ""}
        onChange={(e) => updateFilter("type", e.target.value || undefined)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="">All Types</option>
        {PROGRAM_TYPES.map((pt) => (
          <option key={pt.value} value={pt.value}>
            {pt.label}
          </option>
        ))}
      </select>

      {/* Active filter */}
      <select
        value={currentActive === undefined ? "" : String(currentActive)}
        onChange={(e) => updateFilter("active", e.target.value || undefined)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="">All Statuses</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>

      {/* Clear filters */}
      {(currentType || currentActive !== undefined) && (
        <button
          onClick={() => router.push("/programs")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
