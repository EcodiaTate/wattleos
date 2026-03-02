// src/app/(app)/parent/recurring-billing/page.tsx
//
// ============================================================
// WattleOS V2 - Parent: Recurring Billing / Direct Debit
// ============================================================
// Server Component. Shows the parent their active direct debit
// setups, mandate details, and payment history. Allows payment
// method updates and setup cancellation requests.
// ============================================================

import { ParentRecurringBillingClient } from "@/components/domain/recurring-billing/parent-recurring-billing-client";
import { getParentRecurringBillingSetups } from "@/lib/actions/recurring-billing";

export const metadata = { title: "Direct Debit - WattleOS" };

export default async function ParentRecurringBillingPage() {
  const result = await getParentRecurringBillingSetups();
  const setups = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Direct Debit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your recurring payment setups and view collection history.
        </p>
      </div>

      <ParentRecurringBillingClient setups={setups} />
    </div>
  );
}
