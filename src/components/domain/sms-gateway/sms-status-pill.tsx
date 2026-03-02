"use client";

// src/components/domain/sms-gateway/sms-status-pill.tsx

import type { SmsStatus } from "@/types/domain";
import { SMS_STATUS_CONFIG } from "@/lib/constants/sms-gateway";

interface Props {
  status: SmsStatus;
  size?: "sm" | "md";
}

export function SmsStatusPill({ status, size = "md" }: Props) {
  const cfg    = SMS_STATUS_CONFIG[status];
  const cssVar = cfg?.cssVar ?? "pending";

  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold leading-none ${px}`}
      style={{
        color:      `var(--sms-${cssVar}-fg)`,
        background: `var(--sms-${cssVar}-bg)`,
      }}
    >
      {cfg?.label ?? status}
    </span>
  );
}
