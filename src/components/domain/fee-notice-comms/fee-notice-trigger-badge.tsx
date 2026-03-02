"use client";

// src/components/domain/fee-notice-comms/fee-notice-trigger-badge.tsx

import type { FeeNoticeTrigger } from "@/types/domain";

const TRIGGER_CONFIG: Record<FeeNoticeTrigger, { label: string; icon: string }> =
  {
    invoice_sent: { label: "Invoice Sent", icon: "📤" },
    invoice_overdue: { label: "Overdue", icon: "⚠️" },
    payment_received: { label: "Payment Received", icon: "✅" },
    payment_failed: { label: "Payment Failed", icon: "❌" },
    reminder_1: { label: "Reminder 1", icon: "🔔" },
    reminder_2: { label: "Reminder 2", icon: "🔔" },
    reminder_3: { label: "Final Reminder", icon: "🚨" },
  };

interface Props {
  trigger: FeeNoticeTrigger;
}

export function FeeNoticeTriggerBadge({ trigger }: Props) {
  const cfg = TRIGGER_CONFIG[trigger];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <span>{cfg.icon}</span>
      <span style={{ color: "var(--foreground)" }}>{cfg.label}</span>
    </span>
  );
}
