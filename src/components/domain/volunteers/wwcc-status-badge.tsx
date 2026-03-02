// src/components/domain/volunteers/wwcc-status-badge.tsx

import type { VolunteerWwccStatus } from "@/types/domain";

interface WwccStatusBadgeProps {
  status: VolunteerWwccStatus;
  expiryDate?: string | null;
  daysUntilExpiry?: number | null;
  size?: "sm" | "md";
}

const CONFIG: Record<
  VolunteerWwccStatus,
  { label: string; color: string; fg: string; bg: string }
> = {
  current: {
    label: "WWCC Current",
    color: "var(--volunteer-wwcc-current)",
    fg: "var(--volunteer-wwcc-current-fg)",
    bg: "var(--volunteer-wwcc-current-bg)",
  },
  expiring_soon: {
    label: "Expiring Soon",
    color: "var(--volunteer-wwcc-expiring-soon)",
    fg: "var(--volunteer-wwcc-expiring-soon-fg)",
    bg: "var(--volunteer-wwcc-expiring-soon-bg)",
  },
  expired: {
    label: "WWCC Expired",
    color: "var(--volunteer-wwcc-expired)",
    fg: "var(--volunteer-wwcc-expired-fg)",
    bg: "var(--volunteer-wwcc-expired-bg)",
  },
  missing: {
    label: "No WWCC",
    color: "var(--volunteer-wwcc-missing)",
    fg: "var(--volunteer-wwcc-missing-fg)",
    bg: "var(--volunteer-wwcc-missing-bg)",
  },
};

export function WwccStatusBadge({
  status,
  expiryDate,
  daysUntilExpiry,
  size = "md",
}: WwccStatusBadgeProps) {
  const cfg = CONFIG[status];

  const expiryLabel =
    status === "expiring_soon" && daysUntilExpiry !== null && daysUntilExpiry !== undefined
      ? ` · ${daysUntilExpiry}d`
      : status === "expired" && expiryDate
        ? ` · exp ${new Date(expiryDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" })}`
        : "";

  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.fg,
        fontSize: size === "sm" ? "0.7rem" : "0.75rem",
        fontWeight: 600,
        padding: size === "sm" ? "2px 6px" : "3px 8px",
        borderRadius: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {cfg.label}
      {expiryLabel}
    </span>
  );
}
