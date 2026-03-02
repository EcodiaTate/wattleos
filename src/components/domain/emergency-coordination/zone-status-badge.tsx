"use client";

import type { EmergencyZoneStatus } from "@/types/domain";

const ZONE_STATUS_CONFIG: Record<
  EmergencyZoneStatus,
  { label: string; color: string; fg: string }
> = {
  pending: {
    label: "Pending",
    color: "var(--zone-pending)",
    fg: "var(--zone-pending-fg)",
  },
  evacuating: {
    label: "Evacuating",
    color: "var(--zone-evacuating)",
    fg: "var(--zone-evacuating-fg)",
  },
  clear: {
    label: "Clear",
    color: "var(--zone-clear)",
    fg: "var(--zone-clear-fg)",
  },
  needs_assistance: {
    label: "Needs Help",
    color: "var(--zone-needs-assistance)",
    fg: "var(--zone-needs-assistance-fg)",
  },
  blocked: {
    label: "Blocked",
    color: "var(--zone-blocked)",
    fg: "var(--zone-blocked-fg)",
  },
};

export function ZoneStatusBadge({
  status,
}: {
  status: EmergencyZoneStatus;
}) {
  const config = ZONE_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        color: config.fg,
        backgroundColor: config.color,
      }}
    >
      {(status === "needs_assistance" || status === "blocked") && (
        <span className="mr-1 animate-pulse">!</span>
      )}
      {config.label}
    </span>
  );
}
