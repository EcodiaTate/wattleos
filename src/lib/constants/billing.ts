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

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bgColor: string; color: string }
> = {
  draft: { label: "Draft", bgColor: "bg-muted", color: "text-gray-700" },
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-100",
    color: "text-yellow-700",
  },
  sent: { label: "Sent", bgColor: "bg-blue-100", color: "text-blue-700" },
  paid: { label: "Paid", bgColor: "bg-green-100", color: "text-green-700" },
  partially_paid: {
    label: "Partial",
    bgColor: "bg-amber-100",
    color: "text-amber-700",
  },
  overdue: { label: "Overdue", bgColor: "bg-red-100", color: "text-red-700" },
  void: { label: "Void", bgColor: "bg-muted", color: "text-muted-foreground" },
  refunded: {
    label: "Refunded",
    bgColor: "bg-purple-100",
    color: "text-purple-700",
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bgColor: string; color: string }
> = {
  succeeded: {
    label: "Paid",
    bgColor: "bg-green-100",
    color: "text-green-700",
  },
  failed: { label: "Failed", bgColor: "bg-red-100", color: "text-red-700" },
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-100",
    color: "text-yellow-700",
  },
  refunded: {
    label: "Refunded",
    bgColor: "bg-purple-100",
    color: "text-purple-700",
  },
  partially_refunded: {
    label: "Partial Refund",
    bgColor: "bg-purple-50",
    color: "text-purple-600",
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
