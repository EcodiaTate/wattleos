// src/lib/constants/billing.ts
//
// ============================================================
// WattleOS V2 - Billing Constants
// ============================================================

export type InvoiceStatus =
  | "draft"
  | "pending"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "void"
  | "refunded";

export type PaymentStatus =
  | "succeeded"
  | "failed"
  | "pending"
  | "refunded"
  | "partially_refunded";

export type FeeFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "termly"
  | "annually"
  | "one_off";

// CSS var references - use as inline styles:
//   style={{ color: config.fgVar, background: config.bgVar }}
export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; fgVar: string; bgVar: string }
> = {
  draft: {
    label: "Draft",
    fgVar: "var(--invoice-draft-fg)",
    bgVar: "var(--invoice-draft-bg)",
  },
  pending: {
    label: "Pending",
    fgVar: "var(--invoice-pending-fg)",
    bgVar: "var(--invoice-pending-bg)",
  },
  sent: {
    label: "Sent",
    fgVar: "var(--invoice-sent-fg)",
    bgVar: "var(--invoice-sent-bg)",
  },
  paid: {
    label: "Paid",
    fgVar: "var(--invoice-paid-fg)",
    bgVar: "var(--invoice-paid-bg)",
  },
  partially_paid: {
    label: "Partial",
    fgVar: "var(--invoice-partial-fg)",
    bgVar: "var(--invoice-partial-bg)",
  },
  overdue: {
    label: "Overdue",
    fgVar: "var(--invoice-overdue-fg)",
    bgVar: "var(--invoice-overdue-bg)",
  },
  void: {
    label: "Void",
    fgVar: "var(--invoice-void-fg)",
    bgVar: "var(--invoice-void-bg)",
  },
  refunded: {
    label: "Refunded",
    fgVar: "var(--invoice-refunded-fg)",
    bgVar: "var(--invoice-refunded-bg)",
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; fgVar: string; bgVar: string }
> = {
  succeeded: {
    label: "Paid",
    fgVar: "var(--invoice-paid-fg)",
    bgVar: "var(--invoice-paid-bg)",
  },
  failed: {
    label: "Failed",
    fgVar: "var(--invoice-overdue-fg)",
    bgVar: "var(--invoice-overdue-bg)",
  },
  pending: {
    label: "Pending",
    fgVar: "var(--invoice-pending-fg)",
    bgVar: "var(--invoice-pending-bg)",
  },
  refunded: {
    label: "Refunded",
    fgVar: "var(--invoice-refunded-fg)",
    bgVar: "var(--invoice-refunded-bg)",
  },
  partially_refunded: {
    label: "Partial Refund",
    fgVar: "var(--invoice-partial-fg)",
    bgVar: "var(--invoice-partial-bg)",
  },
};

export const FEE_FREQUENCY_CONFIG: Record<
  FeeFrequency,
  { label: string; shortLabel: string }
> = {
  weekly: { label: "Weekly", shortLabel: "/wk" },
  fortnightly: { label: "Fortnightly", shortLabel: "/2wk" },
  monthly: { label: "Monthly", shortLabel: "/mo" },
  termly: { label: "Per Term", shortLabel: "/term" },
  annually: { label: "Annually", shortLabel: "/yr" },
  one_off: { label: "One-off", shortLabel: "" },
};

/** Format cents to dollars string (e.g., 15000 → "$150.00") */
export function formatCurrency(
  cents: number,
  currency: string = "aud",
): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(dollars);
}
