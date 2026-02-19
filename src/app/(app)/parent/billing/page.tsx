// src/app/(app)/parent/billing/page.tsx
//
// ============================================================
// WattleOS V2 - Parent: Billing & Invoices
// ============================================================
// Server Component. Loads invoices for the logged-in parent.
// Parents see their invoices (excluding drafts) with payment
// status and Stripe hosted payment links.
// ============================================================

import { getParentInvoices } from '@/lib/actions/billing';
import { ParentBillingClient } from '@/components/domain/billing/parent-billing-client';

export default async function ParentBillingPage() {
  const result = await getParentInvoices();
  const invoices = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your invoices and payment history.
        </p>
      </div>

      <ParentBillingClient invoices={invoices} />
    </div>
  );
}