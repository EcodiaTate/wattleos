// src/components/domain/push-notifications/dispatch-status-badge.tsx

import type { NotificationStatus, NotificationDeliveryStatus } from "@/types/domain";

const DISPATCH_STATUS_CONFIG: Record<
  NotificationStatus,
  { label: string; var: string }
> = {
  draft:     { label: "Draft",     var: "--push-draft" },
  scheduled: { label: "Scheduled", var: "--push-scheduled" },
  sending:   { label: "Sending…",  var: "--push-sending" },
  sent:      { label: "Sent",      var: "--push-sent" },
  cancelled: { label: "Cancelled", var: "--push-cancelled" },
  failed:    { label: "Failed",    var: "--push-failed" },
};

const DELIVERY_STATUS_CONFIG: Record<
  NotificationDeliveryStatus,
  { label: string; var: string }
> = {
  pending:   { label: "Pending",   var: "--push-delivery-pending" },
  sent:      { label: "Sent",      var: "--push-delivery-sent" },
  delivered: { label: "Delivered", var: "--push-delivery-delivered" },
  failed:    { label: "Failed",    var: "--push-delivery-failed" },
  bounced:   { label: "Bounced",   var: "--push-delivery-bounced" },
};

export function DispatchStatusBadge({ status }: { status: NotificationStatus }) {
  const cfg = DISPATCH_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `var(${cfg.var}-bg)`,
        color: `var(${cfg.var}-fg)`,
        border: `1px solid var(${cfg.var})`,
      }}
    >
      {cfg.label}
    </span>
  );
}

export function DeliveryStatusBadge({ status }: { status: NotificationDeliveryStatus }) {
  const cfg = DELIVERY_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `var(${cfg.var}-bg, hsl(220 8% 92%))`,
        color: `var(${cfg.var}-fg)`,
      }}
    >
      {cfg.label}
    </span>
  );
}
