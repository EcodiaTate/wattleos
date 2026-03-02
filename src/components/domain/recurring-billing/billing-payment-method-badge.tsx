"use client";

// ============================================================
// Billing Payment Method Badge
// ============================================================
// Displays collection method (BECS, card, manual transfer)
// ============================================================

import type { BillingCollectionMethod } from "@/types/domain";

interface BillingPaymentMethodBadgeProps {
  method: BillingCollectionMethod;
}

export function BillingPaymentMethodBadge({
  method,
}: BillingPaymentMethodBadgeProps) {
  const labelMap: Record<BillingCollectionMethod, string> = {
    stripe_becs: "Stripe BECS Direct Debit",
    stripe_card: "Stripe Card",
    manual_bank_transfer: "Manual Bank Transfer",
  };

  return <span className="font-medium text-foreground">{labelMap[method]}</span>;
}
