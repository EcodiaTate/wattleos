// src/components/domain/volunteers/assignment-status-badge.tsx

import type { VolunteerAssignmentStatus } from "@/types/domain";

interface AssignmentStatusBadgeProps {
  status: VolunteerAssignmentStatus;
}

const CONFIG: Record<
  VolunteerAssignmentStatus,
  { label: string; color: string; fg: string; bg: string }
> = {
  invited: {
    label: "Invited",
    color: "var(--volunteer-assignment-invited)",
    fg: "var(--volunteer-assignment-invited-fg)",
    bg: "var(--volunteer-assignment-invited-bg)",
  },
  confirmed: {
    label: "Confirmed",
    color: "var(--volunteer-assignment-confirmed)",
    fg: "var(--volunteer-assignment-confirmed-fg)",
    bg: "var(--volunteer-assignment-confirmed-bg)",
  },
  declined: {
    label: "Declined",
    color: "var(--volunteer-assignment-declined)",
    fg: "var(--volunteer-assignment-declined-fg)",
    bg: "var(--volunteer-assignment-declined-bg)",
  },
  attended: {
    label: "Attended",
    color: "var(--volunteer-assignment-attended)",
    fg: "var(--volunteer-assignment-attended-fg)",
    bg: "var(--volunteer-assignment-attended-bg)",
  },
  no_show: {
    label: "No Show",
    color: "var(--volunteer-assignment-no-show)",
    fg: "var(--volunteer-assignment-no-show-fg)",
    bg: "var(--volunteer-assignment-no-show-bg)",
  },
};

export function AssignmentStatusBadge({ status }: AssignmentStatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.fg,
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 9999,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
