"use client";

// src/components/domain/dismissal/dismissal-status-badge.tsx
//
// Status badge for dismissal records: pending / confirmed / exception
// and dismissal method badges: parent_pickup / bus / oshc / walker / other

import type { DismissalMethod, DismissalStatus } from "@/types/domain";

// ── Status badge ─────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DismissalStatus,
  { label: string; style: React.CSSProperties }
> = {
  pending: {
    label: "Pending",
    style: {
      color: "var(--dismissal-pending-fg)",
      backgroundColor: "var(--dismissal-pending-bg)",
      border: "1px solid var(--dismissal-pending)",
    },
  },
  confirmed: {
    label: "Confirmed",
    style: {
      color: "var(--dismissal-confirmed-fg)",
      backgroundColor: "var(--dismissal-confirmed-bg)",
      border: "1px solid var(--dismissal-confirmed)",
    },
  },
  exception: {
    label: "Exception",
    style: {
      color: "var(--dismissal-exception-fg)",
      backgroundColor: "var(--dismissal-exception-bg)",
      border: "1px solid var(--dismissal-exception)",
    },
  },
};

interface DismissalStatusBadgeProps {
  status: DismissalStatus;
  size?: "sm" | "md";
}

export function DismissalStatusBadge({
  status,
  size = "md",
}: DismissalStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      style={config.style}
    >
      {config.label}
    </span>
  );
}

// ── Method badge ─────────────────────────────────────────────

const METHOD_CONFIG: Record<
  DismissalMethod,
  { label: string; emoji: string; style: React.CSSProperties }
> = {
  parent_pickup: {
    label: "Parent pickup",
    emoji: "👤",
    style: {
      color: "var(--dismissal-parent-pickup-fg)",
      backgroundColor: "var(--dismissal-parent-pickup-bg)",
      border: "1px solid var(--dismissal-parent-pickup)",
    },
  },
  bus: {
    label: "Bus",
    emoji: "🚌",
    style: {
      color: "var(--dismissal-bus-fg)",
      backgroundColor: "var(--dismissal-bus-bg)",
      border: "1px solid var(--dismissal-bus)",
    },
  },
  oshc: {
    label: "OSHC",
    emoji: "🏫",
    style: {
      color: "var(--dismissal-oshc-fg)",
      backgroundColor: "var(--dismissal-oshc-bg)",
      border: "1px solid var(--dismissal-oshc)",
    },
  },
  walker: {
    label: "Walker",
    emoji: "🚶",
    style: {
      color: "var(--dismissal-walker-fg)",
      backgroundColor: "var(--dismissal-walker-bg)",
      border: "1px solid var(--dismissal-walker)",
    },
  },
  other: {
    label: "Other",
    emoji: "📋",
    style: {
      color: "var(--dismissal-other-fg)",
      backgroundColor: "var(--dismissal-other-bg)",
      border: "1px solid var(--dismissal-other)",
    },
  },
};

interface DismissalMethodBadgeProps {
  method: DismissalMethod;
  size?: "sm" | "md";
  showEmoji?: boolean;
}

export function DismissalMethodBadge({
  method,
  size = "md",
  showEmoji = true,
}: DismissalMethodBadgeProps) {
  const config = METHOD_CONFIG[method];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      style={config.style}
    >
      {showEmoji && <span>{config.emoji}</span>}
      {config.label}
    </span>
  );
}
