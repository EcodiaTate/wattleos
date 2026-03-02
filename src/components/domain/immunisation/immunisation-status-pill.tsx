"use client";

import type { ImmunisationStatus } from "@/types/domain";

interface ImmunisationStatusPillProps {
  status: ImmunisationStatus;
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<ImmunisationStatus, string> = {
  up_to_date: "Up to Date",
  catch_up_schedule: "Catch-up",
  medical_exemption: "Exemption",
  pending: "Pending",
};

const STATUS_TOKENS: Record<
  ImmunisationStatus,
  { bg: string; fg: string }
> = {
  up_to_date: {
    bg: "var(--immunisation-up-to-date-bg)",
    fg: "var(--immunisation-up-to-date)",
  },
  catch_up_schedule: {
    bg: "var(--immunisation-catch-up-bg)",
    fg: "var(--immunisation-catch-up)",
  },
  medical_exemption: {
    bg: "var(--immunisation-exemption-bg)",
    fg: "var(--immunisation-exemption)",
  },
  pending: {
    bg: "var(--immunisation-pending-bg)",
    fg: "var(--immunisation-pending)",
  },
};

export function ImmunisationStatusPill({
  status,
  size = "sm",
}: ImmunisationStatusPillProps) {
  const tokens = STATUS_TOKENS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{
        backgroundColor: tokens.bg,
        color: tokens.fg,
      }}
    >
      {label}
    </span>
  );
}
