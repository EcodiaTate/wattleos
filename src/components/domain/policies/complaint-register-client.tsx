"use client";

import { useState } from "react";
import type { Complaint, ComplaintStatus } from "@/types/domain";
import { ComplaintCard } from "./complaint-card";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ComplaintRegisterClientProps {
  complaints: Complaint[];
}

const STATUS_TABS: { label: string; value: ComplaintStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Escalated", value: "escalated" },
  { label: "Resolved", value: "resolved" },
];

export function ComplaintRegisterClient({ complaints }: ComplaintRegisterClientProps) {
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const haptics = useHaptics();

  const filtered =
    filter === "all"
      ? complaints
      : complaints.filter((c) => c.status === filter);

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? complaints.length
              : complaints.filter((c) => c.status === tab.value).length;

          return (
            <button
              key={tab.value}
              onClick={() => {
                haptics.light();
                setFilter(tab.value);
              }}
              className="active-push flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filter === tab.value ? "var(--primary)" : "var(--muted)",
                color: filter === tab.value ? "var(--primary-foreground)" : "var(--muted-foreground)",
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

      {/* Complaint list */}
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
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
            />
          </svg>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No complaints found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
}
