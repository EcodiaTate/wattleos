"use client";

import type { SickBayVisitStatus } from "@/types/domain";

const STATUS_LABELS: Record<SickBayVisitStatus, string> = {
  open: "Open",
  resolved: "Resolved",
  referred: "Referred",
};

const STATUS_TOKENS: Record<
  SickBayVisitStatus,
  { bg: string; fg: string }
> = {
  open: {
    bg: "var(--sick-bay-open-bg)",
    fg: "var(--sick-bay-open)",
  },
  resolved: {
    bg: "var(--sick-bay-resolved-bg)",
    fg: "var(--sick-bay-resolved)",
  },
  referred: {
    bg: "var(--sick-bay-referred-bg)",
    fg: "var(--sick-bay-referred)",
  },
};

export function SickBayStatusBadge({
  status,
  size = "sm",
}: {
  status: SickBayVisitStatus;
  size?: "sm" | "md";
}) {
  const tokens = STATUS_TOKENS[status];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: tokens.bg,
        color: tokens.fg,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
