"use client";

import type {
  TuckshopOrderStatus,
  TuckshopDeliveryStatus,
} from "@/types/domain";

// ── Order Status ─────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<
  TuckshopOrderStatus,
  { label: string; colorVar: string; bgVar: string }
> = {
  draft: {
    label: "Draft",
    colorVar: "var(--muted-foreground)",
    bgVar: "var(--muted)",
  },
  submitted: {
    label: "Submitted",
    colorVar: "var(--tuckshop-submitted-fg)",
    bgVar: "var(--tuckshop-submitted-bg)",
  },
  ready: {
    label: "Ready",
    colorVar: "var(--tuckshop-ready-fg)",
    bgVar: "var(--tuckshop-ready-bg)",
  },
  collected: {
    label: "Collected",
    colorVar: "var(--tuckshop-collected-fg)",
    bgVar: "var(--tuckshop-collected-bg)",
  },
  cancelled: {
    label: "Cancelled",
    colorVar: "var(--tuckshop-cancelled-fg)",
    bgVar: "var(--tuckshop-cancelled-bg)",
  },
};

export function TuckshopOrderStatusBadge({
  status,
}: {
  status: TuckshopOrderStatus;
}) {
  const config = ORDER_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: config.colorVar, backgroundColor: config.bgVar }}
    >
      {config.label}
    </span>
  );
}

// ── Delivery Status ──────────────────────────────────────────

const DELIVERY_STATUS_CONFIG: Record<
  TuckshopDeliveryStatus,
  { label: string; colorVar: string; bgVar: string }
> = {
  open: {
    label: "Open",
    colorVar: "var(--tuckshop-delivery-open-fg)",
    bgVar: "var(--tuckshop-delivery-open-bg)",
  },
  ordered: {
    label: "Ordered",
    colorVar: "var(--tuckshop-delivery-ordered-fg)",
    bgVar: "var(--tuckshop-delivery-ordered-bg)",
  },
  received: {
    label: "Received",
    colorVar: "var(--tuckshop-delivery-received-fg)",
    bgVar: "var(--tuckshop-delivery-received-bg)",
  },
  finalized: {
    label: "Finalized",
    colorVar: "var(--tuckshop-delivery-finalized-fg)",
    bgVar: "var(--tuckshop-delivery-finalized-bg)",
  },
};

export function TuckshopDeliveryStatusBadge({
  status,
}: {
  status: TuckshopDeliveryStatus;
}) {
  const config = DELIVERY_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: config.colorVar, backgroundColor: config.bgVar }}
    >
      {config.label}
    </span>
  );
}
