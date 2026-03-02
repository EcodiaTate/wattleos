"use client";

import type { TimeEntryConfirmationData } from "@/types/ask-wattle";
import type { RevertState } from "@/lib/hooks/use-ask-wattle";
import type { RevertDescriptor } from "@/types/ask-wattle";
import { RevertButton } from "./revert-button";

interface Props {
  data: TimeEntryConfirmationData["data"];
  revert?: RevertDescriptor;
  revertState?: RevertState;
  onRevert: () => void;
}

export function TimeEntryCard({ data, revert, revertState, onRevert }: Props) {
  const typeLabel =
    data.entry_type === "overtime"
      ? "Overtime"
      : data.entry_type === "leave"
        ? "Leave"
        : "Regular";
  const typeBg =
    data.entry_type === "overtime"
      ? "color-mix(in srgb, var(--attendance-late) 12%, transparent)"
      : data.entry_type === "leave"
        ? "color-mix(in srgb, var(--attendance-excused) 12%, transparent)"
        : "color-mix(in srgb, var(--attendance-present) 12%, transparent)";
  const typeColor =
    data.entry_type === "overtime"
      ? "var(--attendance-late-fg)"
      : data.entry_type === "leave"
        ? "var(--attendance-excused-fg)"
        : "var(--attendance-present-fg)";

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--wattle-dark)" }}
            >
              {data.total_hours}h logged
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: typeBg, color: typeColor }}
            >
              {typeLabel}
            </span>
          </div>
          <span
            className="block text-[11px] mt-0.5"
            style={{ color: "var(--wattle-tan)" }}
          >
            {data.date_display} - {data.start_time}–{data.end_time}
            {data.break_minutes > 0 ? ` (${data.break_minutes}min break)` : ""}
          </span>
          {data.notes && (
            <span
              className="block text-[10px] mt-0.5"
              style={{ color: "var(--wattle-tan)" }}
            >
              {data.notes}
            </span>
          )}
        </div>
        {revert && (
          <RevertButton
            label={revert.label}
            state={revertState ?? "idle"}
            onRevert={onRevert}
          />
        )}
      </div>
    </div>
  );
}
