"use client";

import type { BulkAttendanceConfirmationData } from "@/types/ask-wattle";
import type { RevertState } from "@/lib/hooks/use-ask-wattle";
import type { RevertDescriptor } from "@/types/ask-wattle";
import { RevertButton } from "./revert-button";

const STATUS_COLORS: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  present: {
    bg: "color-mix(in srgb, var(--attendance-present) 12%, transparent)",
    color: "var(--attendance-present-fg)",
    label: "Present",
  },
  absent: {
    bg: "color-mix(in srgb, var(--attendance-absent) 12%, transparent)",
    color: "var(--attendance-absent-fg)",
    label: "Absent",
  },
  late: {
    bg: "color-mix(in srgb, var(--attendance-late) 12%, transparent)",
    color: "var(--attendance-late-fg)",
    label: "Late",
  },
  excused: {
    bg: "color-mix(in srgb, var(--attendance-excused) 12%, transparent)",
    color: "var(--attendance-excused-fg)",
    label: "Excused",
  },
  half_day: {
    bg: "color-mix(in srgb, var(--attendance-half-day) 12%, transparent)",
    color: "var(--attendance-half-day-fg)",
    label: "Half Day",
  },
};

interface Props {
  data: BulkAttendanceConfirmationData["data"];
  revert?: RevertDescriptor;
  revertState?: RevertState;
  onRevert: () => void;
}

export function BulkAttendanceCard({
  data,
  revert,
  revertState,
  onRevert,
}: Props) {
  const statusStyle = STATUS_COLORS[data.status] ?? STATUS_COLORS.present;

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
              {data.class_name}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {data.count} {statusStyle.label}
            </span>
          </div>
          <span
            className="block text-[11px] mt-0.5"
            style={{ color: "var(--wattle-tan)" }}
          >
            {data.date_display} - all students marked
          </span>
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
