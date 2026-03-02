"use client";

// ============================================================
// Billing Status Badge
// ============================================================
// Displays setup or payment attempt status with CSS token colors
// ============================================================

import type {
  RecurringBillingStatus,
  PaymentAttemptStatus,
} from "@/types/domain";

interface BillingStatusBadgeProps {
  status: RecurringBillingStatus | PaymentAttemptStatus;
  size?: "sm" | "base";
}

export function BillingStatusBadge({
  status,
  size = "base",
}: BillingStatusBadgeProps) {
  const tokenMap: Record<RecurringBillingStatus | PaymentAttemptStatus, string> =
    {
      active: "billing-active",
      paused: "billing-paused",
      failed: "billing-failed",
      cancelled: "billing-cancelled",
      pending: "billing-pending",
      succeeded: "billing-succeeded",
      retry_scheduled: "billing-retry-scheduled",
    };

  const labelMap: Record<RecurringBillingStatus | PaymentAttemptStatus, string> =
    {
      active: "Active",
      paused: "Paused",
      failed: "Failed",
      cancelled: "Cancelled",
      pending: "Pending",
      succeeded: "Succeeded",
      retry_scheduled: "Retry Scheduled",
    };

  const token = tokenMap[status];
  const label = labelMap[status];

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-block rounded-full font-medium whitespace-nowrap ${sizeClasses}`}
      style={{
        color: `var(--${token}-fg)`,
        backgroundColor: `var(--${token}-bg)`,
      }}
    >
      {label}
    </span>
  );
}
