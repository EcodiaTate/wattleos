"use client";

import { useState } from "react";
import type { DrillStatus, EmergencyDrill } from "@/types/domain";
import { DrillCard } from "./drill-card";
import { useHaptics } from "@/lib/hooks/use-haptics";

const STATUS_TABS: Array<{ label: string; value: DrillStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

interface DrillListClientProps {
  drills: EmergencyDrill[];
}

export function DrillListClient({ drills }: DrillListClientProps) {
  const haptics = useHaptics();
  const [filter, setFilter] = useState<DrillStatus | "all">("all");

  const filtered =
    filter === "all"
      ? drills
      : drills.filter((d) => d.status === filter);

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? drills.length
              : drills.filter((d) => d.status === tab.value).length;

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
                  filter === tab.value ? "var(--primary)" : "var(--muted)",
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

      {/* Drill list */}
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
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No drills found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((drill) => (
            <DrillCard key={drill.id} drill={drill} />
          ))}
        </div>
      )}
    </div>
  );
}
