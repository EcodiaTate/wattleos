// src/components/domain/billing/parent-billing-client.tsx
"use client";

import type { InvoiceStatus } from "@/lib/constants/billing";
import { INVOICE_STATUS_CONFIG, formatCurrency } from "@/lib/constants/billing";
import type { InvoiceWithDetails } from "@/types/domain";
import { useState } from "react";

interface ParentBillingClientProps {
  invoices: InvoiceWithDetails[];
}

export function ParentBillingClient({ invoices }: ParentBillingClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const outstanding = invoices.filter((i) =>
    ["sent", "pending", "overdue"].includes(i.status),
  );
  const paid = invoices.filter((i) => i.status === "paid");
  const other = invoices.filter(
    (i) => !["sent", "pending", "overdue", "paid"].includes(i.status),
  );

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--card)] py-12 text-center animate-fade-in">
        <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      {/* Outstanding */}
      {outstanding.length > 0 && (
        <section>
          <h2 className="mb-3 text-[var(--text-sm)] font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--warning)] animate-pulse" />
            Outstanding ({outstanding.length})
          </h2>
          <div className="space-y-[var(--density-md)]">
            {outstanding.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() =>
                  setExpandedId(expandedId === inv.id ? null : inv.id)
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <section>
          <h2 className="mb-3 text-[var(--text-sm)] font-bold text-[var(--foreground)] uppercase tracking-wider">
            Paid ({paid.length})
          </h2>
          <div className="space-y-[var(--density-md)]">
            {paid.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() =>
                  setExpandedId(expandedId === inv.id ? null : inv.id)
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Other (void, refunded) */}
      {other.length > 0 && (
        <section>
          <h2 className="mb-3 text-[var(--text-sm)] font-bold text-[var(--foreground)] uppercase tracking-wider">
            Other ({other.length})
          </h2>
          <div className="space-y-[var(--density-md)]">
            {other.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                expanded={expandedId === inv.id}
                onToggle={() =>
                  setExpandedId(expandedId === inv.id ? null : inv.id)
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

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
    INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus] ??
    INVOICE_STATUS_CONFIG.draft;

  const studentName = invoice.student
    ? `${invoice.student.first_name} ${invoice.student.last_name}`
    : "Student";

  const isPayable =
    ["sent", "pending", "overdue"].includes(invoice.status) &&
    invoice.stripe_hosted_url;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)] card-interactive">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-[var(--density-card-padding)] py-4 text-left transition-colors hover:bg-[var(--hover-overlay)]"
      >
        <div className="flex items-center gap-[var(--density-md)]">
          <div>
            <p className="text-[var(--text-sm)] font-bold text-[var(--foreground)]">
              {invoice.invoice_number}
            </p>
            <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
              {studentName} · Due{" "}
              {new Date(invoice.due_date).toLocaleDateString("en-AU")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`status-badge px-2.5 py-0.5 text-[10px] ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
          <span className="text-[var(--text-base)] font-bold text-[var(--foreground)] tabular-nums">
            {formatCurrency(invoice.total_cents, invoice.currency)}
          </span>
          <svg
            className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--background)]/50 px-[var(--density-card-padding)] py-4 animate-slide-down">
          {(invoice.period_start || invoice.period_end) && (
            <p className="mb-4 text-[var(--text-xs)] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              Billing period:{" "}
              {invoice.period_start
                ? new Date(invoice.period_start).toLocaleDateString("en-AU")
                : " - "}{" "}
              to{" "}
              {invoice.period_end
                ? new Date(invoice.period_end).toLocaleDateString("en-AU")
                : " - "}
            </p>
          )}

          <div className="space-y-3">
            {invoice.line_items.map((li) => (
              <div key={li.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--text-sm)] font-medium text-[var(--foreground)]">{li.description}</p>
                  {li.quantity > 1 && (
                    <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                      {li.quantity} ×{" "}
                      {formatCurrency(li.unit_amount_cents, invoice.currency)}
                    </p>
                  )}
                </div>
                <span className="text-[var(--text-sm)] font-bold text-[var(--foreground)] tabular-nums">
                  {formatCurrency(li.total_cents, invoice.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-[var(--text-sm)] font-bold text-[var(--foreground)]">Total Amount</span>
            <span className="text-[var(--text-base)] font-black text-[var(--foreground)] tabular-nums">
              {formatCurrency(invoice.total_cents, invoice.currency)}
            </span>
          </div>

          {invoice.amount_paid_cents > 0 &&
            invoice.amount_paid_cents < invoice.total_cents && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[var(--text-xs)] font-semibold text-[var(--success)]">Amount already paid</span>
                <span className="text-[var(--text-xs)] font-bold text-[var(--success)] tabular-nums">
                  {formatCurrency(invoice.amount_paid_cents, invoice.currency)}
                </span>
              </div>
            )}

          {isPayable && (
            <div className="mt-6">
              <a
                href={invoice.stripe_hosted_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-[var(--text-sm)] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] hover:bg-[var(--primary-600)] transition-all active:scale-[0.98]"
              >
                Pay Outstanding Balance -{" "}
                {formatCurrency(
                  invoice.total_cents - invoice.amount_paid_cents,
                  invoice.currency,
                )}
              </a>
            </div>
          )}

          {invoice.status === "paid" && invoice.paid_at && (
            <div className="mt-4 rounded-md bg-[var(--success-foreground)] p-3 border border-[var(--success)]/20 animate-fade-in">
              <p className="text-[var(--text-xs)] font-bold text-[var(--success)] flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Payment received on {new Date(invoice.paid_at).toLocaleDateString("en-AU")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}