// src/app/(app)/admin/admissions/pipeline-kanban.tsx
//
// ============================================================
// WattleOS V2 - Pipeline Kanban Board (Module 13)
// ============================================================
// 'use client' - renders the stage columns, handles search
// filtering, and orchestrates stage transitions via modal.
//
// WHY not drag-and-drop: Stage transitions have validation
// rules (ALLOWED_TRANSITIONS). A "move" button with a target
// picker is more reliable than DnD, especially on iPad where
// teachers will use this. We can add DnD later as polish.
//
// WHY optimistic updates: After a successful transition, we
// move the card between columns client-side instead of
// refetching. The server action is the source of truth; we
// just avoid a full page reload for snappiness.
// ============================================================

"use client";

import type {
  WaitlistEntry,
  WaitlistStage,
} from "@/lib/actions/admissions/waitlist-pipeline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { StageTransitionModal } from "./stage-transition-modal";
import { WaitlistEntryCard } from "./waitlist-entry-card";

// ── Stage display config ─────────────────────────────────────
interface StageConfig {
  label: string;
  color: string; // Tailwind bg class for column header pill
  textColor: string;
  borderColor: string;
}

const STAGE_CONFIG: Record<string, StageConfig> = {
  inquiry: {
    label: "Inquiry",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  waitlisted: {
    label: "Waitlisted",
    color: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  tour_scheduled: {
    label: "Tour Scheduled",
    color: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  tour_completed: {
    label: "Tour Done",
    color: "bg-teal-100",
    textColor: "text-teal-700",
    borderColor: "border-teal-200",
  },
  offered: {
    label: "Offered",
    color: "bg-orange-100",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
};

// ── Allowed transitions (mirrors server-side) ────────────────
// WHY duplicate here: We need to know which target stages to
// show in the modal without a round-trip.
const ALLOWED_TRANSITIONS: Record<string, WaitlistStage[]> = {
  inquiry: ["waitlisted", "withdrawn"],
  waitlisted: ["tour_scheduled", "offered", "withdrawn"],
  tour_scheduled: ["tour_completed", "waitlisted", "withdrawn"],
  tour_completed: ["offered", "waitlisted", "withdrawn"],
  offered: ["accepted", "declined", "withdrawn"],
  accepted: ["enrolled", "withdrawn"],
  enrolled: [],
  declined: ["waitlisted"],
  withdrawn: ["inquiry"],
};

// ── Props ────────────────────────────────────────────────────

interface PipelineKanbanProps {
  stageEntries: Record<string, WaitlistEntry[]>;
  stageCounts: Record<string, number>;
  kanbanStages: WaitlistStage[];
  canManage: boolean;
}

export function PipelineKanban({
  stageEntries: initialEntries,
  stageCounts,
  kanbanStages,
  canManage,
}: PipelineKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");

  // Local state for optimistic updates after transitions
  const [entries, setEntries] =
    useState<Record<string, WaitlistEntry[]>>(initialEntries);

  // Modal state
  const [transitionTarget, setTransitionTarget] =
    useState<WaitlistEntry | null>(null);

  // ── Derive unique programs for filter dropdown ─────────────
  const allPrograms = useMemo(() => {
    const programs = new Set<string>();
    for (const stageList of Object.values(entries)) {
      for (const entry of stageList) {
        if (entry.requested_program) {
          programs.add(entry.requested_program);
        }
      }
    }
    return Array.from(programs).sort();
  }, [entries]);

  // ── Filter entries by search + program ─────────────────────
  const filteredEntries = useMemo(() => {
    const result: Record<string, WaitlistEntry[]> = {};
    const searchLower = search.toLowerCase().trim();

    for (const stage of kanbanStages) {
      result[stage] = (entries[stage] ?? []).filter((entry) => {
        // Program filter
        if (
          programFilter !== "all" &&
          entry.requested_program !== programFilter
        ) {
          return false;
        }

        // Search filter
        if (searchLower) {
          const haystack = [
            entry.child_first_name,
            entry.child_last_name,
            entry.parent_first_name,
            entry.parent_last_name,
            entry.parent_email,
            entry.requested_program ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchLower);
        }

        return true;
      });
    }

    return result;
  }, [entries, search, programFilter, kanbanStages]);

  // ── Handle successful transition (optimistic move) ─────────
  const handleTransitionComplete = useCallback(
    (entryId: string, fromStage: WaitlistStage, toStage: WaitlistStage) => {
      setEntries((prev) => {
        const next = { ...prev };

        // Remove from old column
        next[fromStage] = (next[fromStage] ?? []).filter(
          (e) => e.id !== entryId,
        );

        // If the target is a kanban stage, add to new column
        if (kanbanStages.includes(toStage)) {
          const movedEntry = Object.values(prev)
            .flat()
            .find((e) => e.id === entryId);

          if (movedEntry) {
            next[toStage] = [
              { ...movedEntry, stage: toStage },
              ...(next[toStage] ?? []),
            ];
          }
        }

        return next;
      });

      setTransitionTarget(null);

      // Revalidate in background to sync with server truth
      startTransition(() => {
        router.refresh();
      });
    },
    [kanbanStages, router],
  );

  // ── Total active count ─────────────────────────────────────
  const totalActive = kanbanStages.reduce(
    (sum, stage) => sum + (stageCounts[stage] ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Program filter */}
          {allPrograms.length > 0 && (
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Programs</option>
              {allPrograms.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="text-sm text-gray-500">
          {totalActive} active {totalActive === 1 ? "inquiry" : "inquiries"}
          {isPending && <span className="ml-2 text-amber-600">Syncing…</span>}
        </p>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanStages.map((stage) => {
          const config = STAGE_CONFIG[stage] ?? {
            label: stage,
            color: "bg-gray-100",
            textColor: "text-gray-700",
            borderColor: "border-gray-200",
          };
          const stageList = filteredEntries[stage] ?? [];
          const count = stageCounts[stage] ?? 0;

          return (
            <div
              key={stage}
              className={`flex w-72 min-w-[18rem] flex-shrink-0 flex-col rounded-lg border bg-gray-50 ${config.borderColor}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.color} ${config.textColor}`}
                  >
                    {config.label}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {count}
                </span>
              </div>

              {/* Cards */}
              <div
                className="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
                style={{ maxHeight: "calc(100vh - 20rem)" }}
              >
                {stageList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">
                    No entries
                  </p>
                ) : (
                  stageList.map((entry) => (
                    <WaitlistEntryCard
                      key={entry.id}
                      entry={entry}
                      canManage={canManage}
                      onMoveClick={() => setTransitionTarget(entry)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage transition modal */}
      {transitionTarget && (
        <StageTransitionModal
          entry={transitionTarget}
          allowedTargets={ALLOWED_TRANSITIONS[transitionTarget.stage] ?? []}
          stageConfig={STAGE_CONFIG}
          onClose={() => setTransitionTarget(null)}
          onTransitionComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}
