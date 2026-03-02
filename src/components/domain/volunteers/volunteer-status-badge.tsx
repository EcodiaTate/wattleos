// src/components/domain/volunteers/volunteer-status-badge.tsx

import type { VolunteerStatus } from "@/types/domain";

interface VolunteerStatusBadgeProps {
  status: VolunteerStatus;
}

const CONFIG: Record<
  VolunteerStatus,
  { label: string; style: React.CSSProperties }
> = {
  active: {
    label: "Active",
    style: {
      backgroundColor: "var(--volunteer-wwcc-current-bg)",
      color: "var(--volunteer-wwcc-current-fg)",
    },
  },
  inactive: {
    label: "Inactive",
    style: {
      backgroundColor: "var(--volunteer-wwcc-missing-bg)",
      color: "var(--volunteer-wwcc-missing-fg)",
    },
  },
  suspended: {
    label: "Suspended",
    style: {
      backgroundColor: "var(--volunteer-wwcc-expired-bg)",
      color: "var(--volunteer-wwcc-expired-fg)",
    },
  },
};

export function VolunteerStatusBadge({ status }: VolunteerStatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span
      style={{
        ...cfg.style,
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
