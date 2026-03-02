// src/app/(app)/admin/recurring-billing/new/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Create Recurring Billing Setup
// ============================================================
// Server Component. Displays form to create new direct debit
// setup for a family (Stripe BECS, card, or manual transfer).
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { RecurringBillingSetupFormClient } from "@/components/domain/recurring-billing/recurring-billing-setup-form-client";

export const metadata = { title: "New Recurring Billing Setup - WattleOS" };

export default async function NewRecurringBillingSetupPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_RECURRING_BILLING)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          New Direct Debit Setup
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure recurring billing for a family using Stripe BECS Direct Debit,
          card, or manual bank transfer.
        </p>
      </div>

      <RecurringBillingSetupFormClient />
    </div>
  );
}
