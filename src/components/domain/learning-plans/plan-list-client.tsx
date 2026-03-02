"use client";

import { useState } from "react";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { IlpPlanStatus, IlpSupportCategory, IndividualLearningPlanListItem } from "@/types/domain";
import { ILP_PLAN_STATUS_CONFIG, SUPPORT_CATEGORY_CONFIG } from "@/lib/constants/ilp";
import { PlanCard } from "./plan-card";

const STATUS_TABS: Array<{ label: string; value: IlpPlanStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "In Review", value: "in_review" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

const SUPPORT_CATEGORY_OPTIONS = Object.entries(SUPPORT_CATEGORY_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpSupportCategory,
    label: cfg.label,
    emoji: cfg.emoji,
  }),
);

interface PlanListClientProps {
  plans: IndividualLearningPlanListItem[];
  canManage: boolean;
}

export function PlanListClient({ plans, canManage }: PlanListClientProps) {
  const haptics = useHaptics();
  const [statusFilter, setStatusFilter] = useState<IlpPlanStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<IlpSupportCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = plans.filter((plan) => {
    if (statusFilter !== "all" && plan.plan_status !== statusFilter) return false;
    if (categoryFilter !== "all" && !plan.support_categories.includes(categoryFilter)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const studentName = `${plan.student.first_name} ${plan.student.last_name}`.toLowerCase();
      const preferred = plan.student.preferred_name?.toLowerCase() ?? "";
      const title = plan.plan_title.toLowerCase();
      if (!studentName.includes(q) && !preferred.includes(q) && !title.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with action button */}
      <div className="flex items-center justify-between gap-3">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Learning Plans
        </h1>
        {canManage && (
          <Link
            href="/admin/learning-plans/new"
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            New Plan
          </Link>
        )}
      </div>

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by student name or plan title..."
        className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
        style={{ background: "var(--input)", color: "var(--foreground)" }}
      />

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? plans.length
                : plans.filter((p) => p.plan_status === tab.value).length;

            if (count === 0 && tab.value !== "all") return null;

            return (
              <button
                key={tab.value}
                onClick={() => {
                  haptics.light();
                  setStatusFilter(tab.value);
                }}
                className="active-push flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background:
                    statusFilter === tab.value ? "var(--primary)" : "var(--muted)",
                  color:
                    statusFilter === tab.value
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Support category dropdown */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            haptics.selection();
            setCategoryFilter(e.target.value as IlpSupportCategory | "all");
          }}
          className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="all">All Categories</option>
          {SUPPORT_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.emoji} {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Plan list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {search || statusFilter !== "all" || categoryFilter !== "all"
              ? "No plans match your filters."
              : "No learning plans yet."}
          </p>
          {canManage && !search && statusFilter === "all" && categoryFilter === "all" && (
            <Link
              href="/admin/learning-plans/new"
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              Create your first learning plan
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
