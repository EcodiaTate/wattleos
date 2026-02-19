// src/app/(app)/admin/enrollment/applications/application-filters.tsx
//
// ============================================================
// WattleOS V2 - Application Queue Filters (Module 10)
// ============================================================
// 'use client' - filter controls that update URL searchParams
// via router.push for server-side filtering.
//
// WHY URL-based: Filters are bookmarkable and shareable.
// The server component re-fetches on navigation.
// ============================================================

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface ApplicationFiltersProps {
  currentStatus: string;
  currentPeriod: string;
  currentSearch: string;
  periods: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function ApplicationFilters({
  currentStatus,
  currentPeriod,
  currentSearch,
  periods,
}: ApplicationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Remove page when filters change
      params.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: search.trim() });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status filter */}
      <select
        value={currentStatus}
        onChange={(e) => updateParams({ status: e.target.value })}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Period filter */}
      <select
        value={currentPeriod}
        onChange={(e) => updateParams({ period: e.target.value })}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="">All Periods</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Search
        </button>
      </form>

      {/* Clear filters */}
      {(currentStatus || currentPeriod || currentSearch) && (
        <button
          onClick={() => {
            setSearch("");
            router.push(pathname);
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
