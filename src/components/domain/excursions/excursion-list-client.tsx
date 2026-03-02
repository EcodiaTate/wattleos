"use client";

import { useState, useTransition } from "react";
import type { Excursion, ExcursionStatus } from "@/types/domain";
import { ExcursionCard } from "./excursion-card";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ExcursionListClientProps {
  excursions: Excursion[];
}

const STATUS_TABS: { label: string; value: ExcursionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Planning", value: "planning" },
  { label: "Consents", value: "consents_pending" },
  { label: "Ready", value: "ready_to_depart" },
  { label: "In Progress", value: "in_progress" },
  { label: "Returned", value: "returned" },
  { label: "Cancelled", value: "cancelled" },
];

export function ExcursionListClient({
  excursions,
}: ExcursionListClientProps) {
  const [filter, setFilter] = useState<ExcursionStatus | "all">("all");
  const haptics = useHaptics();

  const filtered =
    filter === "all"
      ? excursions
      : excursions.filter((e) => e.status === filter);

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "all"
            ? excursions.length
            : excursions.filter((e) => e.status === tab.value).length;

          if (count === 0 && tab.value !== "all") return null;

          return (
            <button
              key={tab.value}
              onClick={() => {
                haptics.light();
                setFilter(tab.value);
              }}
              className="active-push flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background:
                  filter === tab.value
                    ? "var(--primary)"
                    : "var(--muted)",
                color:
                  filter === tab.value
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

      {/* Excursion list */}
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
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No excursions found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((excursion) => (
            <ExcursionCard key={excursion.id} excursion={excursion} />
          ))}
        </div>
      )}
    </div>
  );
}
