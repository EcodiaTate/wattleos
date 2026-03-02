"use client";

import { useState } from "react";
import type { Policy, PolicyStatus } from "@/types/domain";
import { PolicyCard } from "./policy-card";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface PolicyListClientProps {
  policies: Policy[];
}

const STATUS_TABS: { label: string; value: PolicyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

const CATEGORIES = [
  { label: "All Categories", value: "all" },
  { label: "Governance", value: "governance" },
  { label: "Health & Safety", value: "health_safety" },
  { label: "Child Protection", value: "child_protection" },
  { label: "Staffing", value: "staffing" },
  { label: "Curriculum", value: "curriculum" },
  { label: "Inclusion", value: "inclusion" },
  { label: "Families", value: "families" },
  { label: "Environment", value: "environment" },
  { label: "Administration", value: "administration" },
  { label: "Other", value: "other" },
];

export function PolicyListClient({ policies }: PolicyListClientProps) {
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const haptics = useHaptics();

  const filtered = policies.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              haptics.light();
              setStatusFilter(tab.value);
            }}
            className="active-push flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: statusFilter === tab.value ? "var(--primary)" : "var(--muted)",
              color: statusFilter === tab.value ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <select
        value={categoryFilter}
        onChange={(e) => {
          haptics.light();
          setCategoryFilter(e.target.value);
        }}
        className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs"
        style={{ background: "var(--input)", color: "var(--foreground)" }}
      >
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>

      {/* Policy list */}
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No policies found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
        </div>
      )}
    </div>
  );
}
