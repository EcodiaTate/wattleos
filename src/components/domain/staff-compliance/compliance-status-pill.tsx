"use client";

import type { ComplianceItemStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  ComplianceItemStatus | "complete" | "missing_geccko",
  { label: string; bg: string; fg: string }
> = {
  valid: {
    label: "Valid",
    bg: "var(--attendance-present-bg, #dcfce7)",
    fg: "var(--attendance-present-fg, #166534)",
  },
  expiring_soon: {
    label: "Expiring",
    bg: "var(--attendance-late-bg, #fef9c3)",
    fg: "var(--attendance-late-fg, #854d0e)",
  },
  expired: {
    label: "Expired",
    bg: "var(--attendance-absent-bg, #fee2e2)",
    fg: "var(--attendance-absent-fg, #991b1b)",
  },
  missing: {
    label: "Missing",
    bg: "var(--muted)",
    fg: "var(--muted-foreground)",
  },
  complete: {
    label: "Complete",
    bg: "var(--attendance-present-bg, #dcfce7)",
    fg: "var(--attendance-present-fg, #166534)",
  },
  missing_geccko: {
    label: "Missing",
    bg: "var(--muted)",
    fg: "var(--muted-foreground)",
  },
};

interface Props {
  status: ComplianceItemStatus | "complete" | "missing";
  daysRemaining?: number | null;
  compact?: boolean;
}

export function ComplianceStatusPill({
  status,
  daysRemaining,
  compact = false,
}: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.missing;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      {config.label}
      {daysRemaining !== null &&
        daysRemaining !== undefined &&
        status === "expiring_soon" && (
          <span className="opacity-75">({daysRemaining}d)</span>
        )}
    </span>
  );
}
