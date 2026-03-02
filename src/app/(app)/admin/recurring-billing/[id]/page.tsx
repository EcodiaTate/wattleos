// src/app/(app)/admin/recurring-billing/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Recurring Billing Setup Detail
// ============================================================
// Server Component. Shows setup details, schedules, payment
// history, and failed payment tracking.
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getRecurringBillingSetup } from "@/lib/actions/recurring-billing";
import { RecurringBillingDetailClient } from "@/components/domain/recurring-billing/recurring-billing-detail-client";

export const metadata = { title: "Setup Details - WattleOS" };

export default async function RecurringBillingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.VIEW_RECURRING_BILLING)) redirect("/dashboard");

  const result = await getRecurringBillingSetup(params.id);
  if (result.error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Setup not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {result.data?.family?.display_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct debit setup and payment history
        </p>
      </div>

      <RecurringBillingDetailClient setup={result.data!} permissions={context.permissions} />
    </div>
  );
}
