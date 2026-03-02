"use client";

// src/components/domain/nccd/nccd-register-client.tsx
//
// Full NCCD register list page - filterable by year, level, category, status.

import Link from "next/link";
import { useState, useMemo } from "react";

import {
  NCCD_CATEGORIES,
  NCCD_CATEGORY_CONFIG,
  NCCD_LEVELS_ORDERED,
  NCCD_LEVEL_CONFIG,
  currentNccdYear,
} from "@/lib/constants/nccd";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  NccdAdjustmentLevel,
  NccdDisabilityCategory,
  NccdEntryWithStudent,
  NccdStatus,
} from "@/types/domain";

import { NccdEntryCard } from "./nccd-entry-card";

interface NccdRegisterClientProps {
  entries: NccdEntryWithStudent[];
  canManage: boolean;
}

export function NccdRegisterClient({
  entries,
  canManage,
}: NccdRegisterClientProps) {
  const haptics = useHaptics();

  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<number>(currentNccdYear());
  const [filterLevel, setFilterLevel] = useState<NccdAdjustmentLevel | "">("");
  const [filterCategory, setFilterCategory] = useState<
    NccdDisabilityCategory | ""
  >("");
  const [filterStatus, setFilterStatus] = useState<NccdStatus | "">("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterYear && e.collection_year !== filterYear) return false;
      if (filterLevel && e.adjustment_level !== filterLevel) return false;
      if (filterCategory && e.disability_category !== filterCategory)
        return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (search) {
        const name =
          `${e.student.first_name} ${e.student.last_name} ${e.student.preferred_name ?? ""}`.toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [entries, search, filterYear, filterLevel, filterCategory, filterStatus]);

  const years = Array.from(new Set(entries.map((e) => e.collection_year))).sort(
    (a, b) => b - a,
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Year filter */}
          <select
            value={filterYear}
            onChange={(e) => {
              haptics.selection();
              setFilterYear(parseInt(e.target.value));
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Level filter */}
          <select
            value={filterLevel}
            onChange={(e) => {
              haptics.selection();
              setFilterLevel(e.target.value as NccdAdjustmentLevel | "");
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <option value="">All levels</option>
            {NCCD_LEVELS_ORDERED.map((l) => (
              <option key={l} value={l}>
                {NCCD_LEVEL_CONFIG[l].shortLabel}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => {
              haptics.selection();
              setFilterCategory(e.target.value as NccdDisabilityCategory | "");
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <option value="">All categories</option>
            {NCCD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {NCCD_CATEGORY_CONFIG[c].label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              haptics.selection();
              setFilterStatus(e.target.value as NccdStatus | "");
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="exited">Exited</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex gap-2 items-center w-full sm:w-auto">
          <input
            type="search"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            style={{ color: "var(--foreground)" }}
          />
          {canManage && (
            <Link
              href="/admin/nccd/register/new"
              className="touch-target active-push rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Add Entry
            </Link>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="flex gap-4 flex-wrap rounded-xl border border-border px-4 py-3 text-sm"
        style={{ background: "var(--card)" }}
      >
        <span style={{ color: "var(--muted-foreground)" }}>
          {filtered.length} of{" "}
          {entries.filter((e) => e.collection_year === filterYear).length}{" "}
          entries
        </span>
        {NCCD_LEVELS_ORDERED.map((lvl) => {
          const count = filtered.filter(
            (e) => e.adjustment_level === lvl,
          ).length;
          if (count === 0) return null;
          const config = NCCD_LEVEL_CONFIG[lvl];
          return (
            <span
              key={lvl}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: config.bgVar, color: config.fgVar }}
            >
              {config.shortLabel}: {count}
            </span>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-3xl" style={{ color: "var(--empty-state-icon)" }}>
            ♿
          </p>
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            No entries found
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {search || filterLevel || filterCategory || filterStatus
              ? "Try adjusting your filters"
              : "Add the first NCCD entry for this collection year"}
          </p>
          {canManage && !search && !filterLevel && !filterCategory && (
            <Link
              href="/admin/nccd/register/new"
              className="touch-target active-push mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Add Entry
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((entry) => (
            <NccdEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
