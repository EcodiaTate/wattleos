"use client";

import type { EmergencyEventStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  EmergencyEventStatus,
  { label: string; color: string; fg: string; bg: string }
> = {
  activated: {
    label: "ACTIVATED",
    color: "var(--emergency-activated)",
    fg: "var(--emergency-activated-fg)",
    bg: "var(--emergency-activated-bg)",
  },
  responding: {
    label: "Responding",
    color: "var(--emergency-responding)",
    fg: "var(--emergency-responding-fg)",
    bg: "var(--emergency-responding-bg)",
  },
  all_clear: {
    label: "All Clear",
    color: "var(--emergency-all-clear)",
    fg: "var(--emergency-all-clear-fg)",
    bg: "var(--emergency-all-clear-bg)",
  },
  resolved: {
    label: "Resolved",
    color: "var(--emergency-resolved)",
    fg: "var(--emergency-resolved-fg)",
    bg: "var(--emergency-resolved-bg)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--emergency-cancelled)",
    fg: "var(--emergency-cancelled-fg)",
    bg: "var(--emergency-cancelled-bg)",
  },
};

export function EmergencyStatusBadge({
  status,
  size = "sm",
}: {
  status: EmergencyEventStatus;
  size?: "sm" | "lg";
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
      style={{
        color: config.fg,
        backgroundColor: config.bg,
        borderColor: config.color,
        borderWidth: "1px",
        borderStyle: "solid",
      }}
    >
      {(status === "activated" || status === "responding") && (
        <span
          className="mr-1.5 h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}
