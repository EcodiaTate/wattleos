// src/app/(app)/admin/admissions/pipeline-kanban.tsx
"use client";

import type {
  WaitlistEntry,
  WaitlistStage,
} from "@/lib/actions/admissions/waitlist-pipeline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { StageTransitionModal } from "./stage-transition-modal";
import { WaitlistEntryCard } from "./waitlist-entry-card";
import { Search, Filter, Info } from "lucide-react"; // Assuming Lucide for icons
// Inside src/app/(app)/admin/admissions/pipeline-kanban.tsx

interface StageConfig {
  label: string;
  varBase: string; // Used for our new CSS variable logic
  // Keep these for the Modal's current internal logic, but map them to our vars
  color: string; 
  textColor: string;
}

const STAGE_CONFIG: Record<string, StageConfig> = {
  inquiry: { 
    label: "Inquiry", 
    varBase: "--enrollment-inquiry",
    color: "var(--enrollment-inquiry)", 
    textColor: "var(--enrollment-inquiry-fg)" 
  },
  waitlisted: { 
    label: "Waitlisted", 
    varBase: "--mastery-practicing",
    color: "var(--mastery-practicing)", 
    textColor: "var(--mastery-practicing-fg)" 
  },
  tour_scheduled: { 
    label: "Tour Scheduled", 
    varBase: "--curriculum-outcome",
    color: "var(--curriculum-outcome)", 
    textColor: "var(--curriculum-outcome-fg)" 
  },
  tour_completed: { 
    label: "Tour Done", 
    varBase: "--curriculum-strand",
    color: "var(--curriculum-strand)", 
    textColor: "var(--curriculum-strand-fg)" 
  },
  offered: { 
    label: "Offered", 
    varBase: "--enrollment-graduated",
    color: "var(--enrollment-graduated)", 
    textColor: "var(--enrollment-graduated-fg)" 
  },
  accepted: { 
    label: "Accepted", 
    varBase: "--enrollment-active",
    color: "var(--enrollment-active)", 
    textColor: "var(--enrollment-active-fg)" 
  },
};

// ── Allowed transitions ────────────────
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
  const [entries, setEntries] = useState<Record<string, WaitlistEntry[]>>(initialEntries);
  const [transitionTarget, setTransitionTarget] = useState<WaitlistEntry | null>(null);

  const allPrograms = useMemo(() => {
    const programs = new Set<string>();
    for (const stageList of Object.values(entries)) {
      for (const entry of stageList) {
        if (entry.requested_program) programs.add(entry.requested_program);
      }
    }
    return Array.from(programs).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const result: Record<string, WaitlistEntry[]> = {};
    const searchLower = search.toLowerCase().trim();

    for (const stage of kanbanStages) {
      result[stage] = (entries[stage] ?? []).filter((entry) => {
        if (programFilter !== "all" && entry.requested_program !== programFilter) return false;
        if (searchLower) {
          const haystack = `${entry.child_first_name} ${entry.child_last_name} ${entry.parent_email} ${entry.requested_program}`.toLowerCase();
          return haystack.includes(searchLower);
        }
        return true;
      });
    }
    return result;
  }, [entries, search, programFilter, kanbanStages]);

  const handleTransitionComplete = useCallback(
    (entryId: string, fromStage: WaitlistStage, toStage: WaitlistStage) => {
      setEntries((prev) => {
        const next = { ...prev };
        next[fromStage] = (next[fromStage] ?? []).filter((e) => e.id !== entryId);
        if (kanbanStages.includes(toStage)) {
          const movedEntry = Object.values(prev).flat().find((e) => e.id === entryId);
          if (movedEntry) {
            next[toStage] = [{ ...movedEntry, stage: toStage }, ...(next[toStage] ?? [])];
          }
        }
        return next;
      });
      setTransitionTarget(null);
      startTransition(() => { router.refresh(); });
    },
    [kanbanStages, router],
  );

  const totalActive = kanbanStages.reduce((sum, stage) => sum + (stageCounts[stage] ?? 0), 0);

  return (
    <div className="space-y-[var(--density-section-gap)]">
      {/* Filters bar */}
      <div className="flex flex-col gap-[var(--density-md)] sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex items-center gap-[var(--density-md)]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-[var(--density-icon-sm)] w-[var(--density-icon-sm)] -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[var(--density-input-height)] rounded-lg border border-input bg-card pl-10 pr-4 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Program filter */}
          {allPrograms.length > 0 && (
            <div className="relative">
                <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="h-[var(--density-input-height)] appearance-none rounded-lg border border-input bg-card px-4 py-2 pr-10 text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                <option value="all">All Programs</option>
                {allPrograms.map((prog) => (
                    <option key={prog} value={prog}>{prog}</option>
                ))}
                </select>
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <Info className="h-4 w-4" />
          <span>
            {totalActive} {totalActive === 1 ? "inquiry" : "inquiries"} active
          </span>
          {isPending && <span className="animate-pulse-soft text-primary font-medium">· Syncing…</span>}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-[var(--density-lg)] overflow-x-auto pb-[var(--density-lg)] scrollbar-thin">
        {kanbanStages.map((stage, idx) => {
          const config = STAGE_CONFIG[stage];
          const stageList = filteredEntries[stage] ?? [];
          const count = stageCounts[stage] ?? 0;

          return (
            <div
              key={stage}
              style={{ '--stagger-idx': idx } as React.CSSProperties}
              className="flex w-80 min-w-[20rem] flex-shrink-0 flex-col rounded-xl border border-border bg-muted/30 animate-fade-in-up stagger-1"
            >
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-border px-[var(--density-md)] py-[var(--density-md)] bg-card/50 rounded-t-xl">
                <div 
                    className="status-badge status-badge-plain"
                    style={{ 
                        '--badge-bg': `var(${config.varBase})`,
                        '--badge-fg': `var(${config.varBase}-fg)`
                    } as React.CSSProperties}
                >
                  {config.label}
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-border/50 px-2 py-0.5 rounded-full tabular-nums">
                  {count}
                </span>
              </div>

              {/* Cards Container */}
              <div
                className="flex flex-1 flex-col gap-[var(--density-md)] overflow-y-auto p-[var(--density-sm)]"
                style={{ maxHeight: "calc(100vh - 16rem)" }}
              >
                {stageList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                    <p className="text-xs font-medium">Empty Stage</p>
                  </div>
                ) : (
                  stageList.map((entry) => (
                    <div key={entry.id} className="animate-scale-in">
                        <WaitlistEntryCard
                            entry={entry}
                            canManage={canManage}
                            onMoveClick={() => setTransitionTarget(entry)}
                        />
                    </div>
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