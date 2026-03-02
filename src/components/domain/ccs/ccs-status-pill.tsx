"use client";

import type { CcsBundleStatus, CcsReportStatus } from "@/types/domain";

type StatusType = CcsBundleStatus | CcsReportStatus;

interface CcsStatusPillProps {
  status: StatusType;
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<StatusType, string> = {
  draft: "Draft",
  ready: "Ready",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
};

const STATUS_TOKENS: Record<StatusType, { bg: string; fg: string }> = {
  draft: { bg: "var(--ccs-draft)", fg: "var(--ccs-draft-fg)" },
  ready: { bg: "var(--ccs-ready)", fg: "var(--ccs-ready-fg)" },
  submitted: { bg: "var(--ccs-submitted)", fg: "var(--ccs-submitted-fg)" },
  accepted: { bg: "var(--ccs-accepted)", fg: "var(--ccs-accepted-fg)" },
  rejected: { bg: "var(--ccs-rejected)", fg: "var(--ccs-rejected-fg)" },
};

export function CcsStatusPill({ status, size = "sm" }: CcsStatusPillProps) {
  const tokens = STATUS_TOKENS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{ backgroundColor: tokens.bg, color: tokens.fg }}
    >
      {label}
    </span>
  );
}
