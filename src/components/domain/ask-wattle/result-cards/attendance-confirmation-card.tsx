"use client";

import type {
  AttendanceConfirmationData,
  RevertDescriptor,
} from "@/types/ask-wattle";
import type { RevertState } from "@/lib/hooks/use-ask-wattle";
import { RevertButton } from "./revert-button";

const STATUS_STYLES: Record<
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
  data: AttendanceConfirmationData["data"];
  revert?: RevertDescriptor;
  revertState: RevertState;
  onRevert: () => void;
}

export function AttendanceConfirmationCard({
  data,
  revert,
  revertState,
  onRevert,
}: Props) {
  const style = STATUS_STYLES[data.status] ?? STATUS_STYLES.present;
  const isReverted = revertState === "reverted";

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{
        background: isReverted
          ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
          : "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: `1px solid ${isReverted ? "color-mix(in srgb, var(--foreground) 6%, transparent)" : "var(--wattle-border)"}`,
      }}
    >
      {/* Tick / Status icon */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isReverted
            ? "color-mix(in srgb, var(--foreground) 6%, transparent)"
            : style.bg,
          color: isReverted ? "var(--muted-foreground)" : style.color,
        }}
      >
        {isReverted ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>

      {/* Student name + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{
              color: isReverted
                ? "var(--muted-foreground)"
                : "var(--wattle-dark)",
              textDecoration: isReverted ? "line-through" : "none",
            }}
          >
            {data.student_name}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              background: isReverted
                ? "color-mix(in srgb, var(--foreground) 6%, transparent)"
                : style.bg,
              color: isReverted ? "var(--muted-foreground)" : style.color,
            }}
          >
            {style.label}
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
          {data.date_display}
          {data.notes ? ` - ${data.notes}` : ""}
        </span>
      </div>

      {/* Revert button */}
      {revert && (
        <RevertButton
          label={revert.label}
          state={revertState}
          onRevert={onRevert}
        />
      )}
    </div>
  );
}
