"use client";

// src/components/domain/ratios/live-educator-breakdown.tsx
//
// Shows live educator counts across all rooms: total on-floor and per-room
// summary. Derives counts from LiveRatioState (floor_sign_ins is_active only).

import type { LiveRatioState } from "@/types/domain";

interface LiveEducatorBreakdownProps {
  ratios: LiveRatioState[];
}

export function LiveEducatorBreakdown({ ratios }: LiveEducatorBreakdownProps) {
  const totalOnFloor = ratios.reduce((s, r) => s + r.educators_on_floor, 0);
  const totalChildren = ratios.reduce((s, r) => s + r.children_present, 0);
  const activeRooms = ratios.filter((r) => r.children_present > 0);

  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        Live Educator Breakdown
      </p>

      {/* Summary line */}
      <p
        className="mt-2 text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {totalOnFloor} educator{totalOnFloor !== 1 ? "s" : ""} on floor
        {totalChildren > 0 && (
          <span
            className="ml-1 font-normal"
            style={{ color: "var(--muted-foreground)" }}
          >
            supervising {totalChildren} child{totalChildren !== 1 ? "ren" : ""}
          </span>
        )}
      </p>

      {/* Per-room rows */}
      {activeRooms.length > 0 && (
        <div className="mt-3 space-y-2">
          {activeRooms.map((r) => {
            const names = r.educators_on_floor_details
              .map((e) => `${e.first_name} ${e.last_name}`.trim())
              .join(", ");

            return (
              <div key={r.class_id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: r.is_compliant
                      ? "var(--attendance-present)"
                      : "var(--attendance-absent-fg, #991b1b)",
                  }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-xs"
                  style={{ color: "var(--foreground)" }}
                >
                  <span className="font-medium">{r.class_name}</span>
                  {names && (
                    <span
                      className="ml-1"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      - {names}
                    </span>
                  )}
                </span>
                <span
                  className="shrink-0 tabular-nums text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {r.educators_on_floor} : {r.children_present}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeRooms.length === 0 && (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          No children currently present
        </p>
      )}
    </div>
  );
}
