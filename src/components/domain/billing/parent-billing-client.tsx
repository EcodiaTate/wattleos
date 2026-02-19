// src/components/domain/billing/parent-billing-client.tsx
//
// ============================================================
// WattleOS V2 - Parent Billing View (Client Component)
// ============================================================
// Read-only invoice list. Parents can:
// • See all their invoices (excluding drafts)
// • Click through to Stripe hosted page to pay
// • See payment status and history
// ============================================================

'use client';

import { useState } from 'react';
import { INVOICE_STATUS_CONFIG, formatCurrency } from '@/lib/constants/billing';
import type { InvoiceStatus } from '@/lib/constants/billing';
import type { InvoiceWithDetails } from '@/types/domain';

interface ParentBillingClientProps {
  invoices: InvoiceWithDetails[];
}

export function ParentBillingClient({ invoices }: ParentBillingClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const outstanding = invoices.filter((i) =>
    ['sent', 'pending', 'overdue'].includes(i.status)
  );
  const paid = invoices.filter((i) => i.status === 'paid');
  const other = invoices.filter((i) =>
    !['sent', 'pending', 'overdue', 'paid'].includes(i.status)
  );

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
        <p className="text-sm text-gray-500">No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Outstanding */}
      {outstanding.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Outstanding ({outstanding.length})
          </h2>
          <div className="space-y-3">
            {outstanding.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Paid ({paid.length})
          </h2>
          <div className="space-y-3">
            {paid.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other (void, refunded) */}
      {other.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Other ({other.length})
          </h2>
          <div className="space-y-3">
            {other.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// INVOICE CARD
// ============================================================

function InvoiceCard({
  invoice,
  expanded,
  onToggle,
}: {
  invoice: InvoiceWithDetails;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig =
    INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus] ?? INVOICE_STATUS_CONFIG.draft;

  const studentName = invoice.student
    ? `${invoice.student.first_name} ${invoice.student.last_name}`
    : 'Student';

  const isPayable = ['sent', 'pending', 'overdue'].includes(invoice.status) && invoice.stripe_hosted_url;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</p>
            <p className="text-xs text-gray-500">
              {studentName} · Due {new Date(invoice.due_date).toLocaleDateString('en-AU')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(invoice.total_cents, invoice.currency)}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          {/* Period */}
          {(invoice.period_start || invoice.period_end) && (
            <p className="mb-3 text-xs text-gray-500">
              Billing period: {invoice.period_start ? new Date(invoice.period_start).toLocaleDateString('en-AU') : '—'} to{' '}
              {invoice.period_end ? new Date(invoice.period_end).toLocaleDateString('en-AU') : '—'}
            </p>
          )}

          {/* Line items */}
          <div className="space-y-2">
            {invoice.line_items.map((li) => (
              <div key={li.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">{li.description}</p>
                  {li.quantity > 1 && (
                    <p className="text-xs text-gray-500">
                      {li.quantity} × {formatCurrency(li.unit_amount_cents, invoice.currency)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(li.total_cents, invoice.currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(invoice.total_cents, invoice.currency)}
            </span>
          </div>

          {/* Amount paid (if partially paid) */}
          {invoice.amount_paid_cents > 0 && invoice.amount_paid_cents < invoice.total_cents && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-green-700">Amount paid</span>
              <span className="text-xs font-medium text-green-700">
                {formatCurrency(invoice.amount_paid_cents, invoice.currency)}
              </span>
            </div>
          )}

          {/* Pay button */}
          {isPayable && (
            <div className="mt-4">
              <a
                href={invoice.stripe_hosted_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
              >
                Pay Now - {formatCurrency(invoice.total_cents - invoice.amount_paid_cents, invoice.currency)}
              </a>
            </div>
          )}

          {/* Paid confirmation */}
          {invoice.status === 'paid' && invoice.paid_at && (
            <div className="mt-3 rounded-md bg-green-50 p-3">
              <p className="text-xs font-medium text-green-700">
                ✓ Paid on {new Date(invoice.paid_at).toLocaleDateString('en-AU')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}