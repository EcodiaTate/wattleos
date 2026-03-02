"use client";

import { useState } from "react";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  TransitionStatementWithStudent,
  TransitionStatementStatus,
} from "@/types/domain";
import { TRANSITION_STATUS_CONFIG } from "@/lib/constants/ilp";
import { TransitionStatementCard } from "./transition-statement-card";

const STATUS_TABS: Array<{
  label: string;
  value: TransitionStatementStatus | "all";
}> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "In Progress", value: "in_progress" },
  { label: "Ready for Family", value: "ready_for_family" },
  { label: "Shared with School", value: "shared_with_school" },
  { label: "Completed", value: "completed" },
];

interface TransitionStatementListClientProps {
  statements: TransitionStatementWithStudent[];
  canManage: boolean;
}

export function TransitionStatementListClient({
  statements,
  canManage,
}: TransitionStatementListClientProps) {
  const haptics = useHaptics();
  const [statusFilter, setStatusFilter] = useState<
    TransitionStatementStatus | "all"
  >("all");

  const filtered =
    statusFilter === "all"
      ? statements
      : statements.filter((s) => s.transition_status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Transition Statements
        </h1>
        {canManage && (
          <Link
            href="/admin/learning-plans/transition-statements/new"
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            New Statement
          </Link>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? statements.length
              : statements.filter((s) => s.transition_status === tab.value)
                  .length;

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
                  statusFilter === tab.value
                    ? "var(--primary)"
                    : "var(--muted)",
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

      {/* Statement list */}
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
              d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {statusFilter !== "all"
              ? "No statements match this filter."
              : "No transition statements yet."}
          </p>
          {canManage && statusFilter === "all" && (
            <Link
              href="/admin/learning-plans/transition-statements/new"
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              Create your first transition statement
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((statement) => (
            <TransitionStatementCard
              key={statement.id}
              statement={statement}
            />
          ))}
        </div>
      )}
    </div>
  );
}
