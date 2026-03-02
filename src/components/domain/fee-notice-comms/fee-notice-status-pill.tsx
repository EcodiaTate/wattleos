"use client";

// src/components/domain/fee-notice-comms/fee-notice-status-pill.tsx

import type { FeeNoticeDeliveryStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  FeeNoticeDeliveryStatus,
  { label: string; cssVar: string }
> = {
  pending: { label: "Pending", cssVar: "pending" },
  sent: { label: "Sent", cssVar: "sent" },
  delivered: { label: "Delivered", cssVar: "delivered" },
  failed: { label: "Failed", cssVar: "failed" },
  skipped: { label: "Skipped", cssVar: "skipped" },
};

interface Props {
  status: FeeNoticeDeliveryStatus;
  size?: "sm" | "md";
}

export function FeeNoticeStatusPill({ status, size = "md" }: Props) {
  const cfg = STATUS_CONFIG[status];
  const px =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px]"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold leading-none ${px}`}
      style={{
        color: `var(--fee-notice-${cfg.cssVar}-fg)`,
        background: `var(--fee-notice-${cfg.cssVar}-bg)`,
      }}
    >
      {cfg.label}
    </span>
  );
}
