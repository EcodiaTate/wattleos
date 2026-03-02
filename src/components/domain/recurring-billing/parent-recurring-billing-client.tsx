"use client";

// ============================================================
// Parent Recurring Billing Client
// ============================================================
// Shows the parent their direct debit setups with mandate info,
// payment history, and options to update payment method.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  getParentPaymentHistory,
  initiatePaymentMethodUpdate,
} from "@/lib/actions/recurring-billing";
import { BillingStatusBadge } from "./billing-status-badge";
import { BillingPaymentMethodBadge } from "./billing-payment-method-badge";
import type {
  RecurringBillingSetupWithFamily,
  BillingPaymentAttempt,
} from "@/types/domain";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  History,
  Shield,
} from "lucide-react";

interface ParentRecurringBillingClientProps {
  setups: RecurringBillingSetupWithFamily[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ParentRecurringBillingClient({
  setups,
}: ParentRecurringBillingClientProps) {
  const router = useRouter();
  const haptics = useHaptics();

  if (setups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CreditCard
          className="mx-auto h-12 w-12"
          style={{ color: "var(--empty-state-icon)" }}
        />
        <h2 className="mt-4 font-semibold text-foreground">
          No direct debit setups
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your school hasn&apos;t set up recurring billing for your family yet.
          Contact the school office for more information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {setups.map((setup) => (
        <SetupCard key={setup.id} setup={setup} />
      ))}
    </div>
  );
}

// ── Individual Setup Card ────────────────────────────────────

function SetupCard({ setup }: { setup: RecurringBillingSetupWithFamily }) {
  const router = useRouter();
  const haptics = useHaptics();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<BillingPaymentAttempt[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleExpand = async () => {
    haptics.light();
    const willExpand = !expanded;
    setExpanded(willExpand);

    if (willExpand && !history) {
      setLoadingHistory(true);
      const result = await getParentPaymentHistory(setup.id);
      setHistory(result.data ?? []);
      setLoadingHistory(false);
    }
  };

  const handleUpdatePaymentMethod = () => {
    haptics.medium();
    startTransition(async () => {
      const result = await initiatePaymentMethodUpdate(
        setup.id,
        window.location.origin,
      );
      if (result.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
      }
    });
  };

  const family = Array.isArray(setup.family) ? setup.family[0] : setup.family;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* ── Header ────────────────────────────────────────────── */}
      <button
        onClick={handleToggleExpand}
        className="flex w-full items-center justify-between p-4 text-left active-push touch-target"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: `var(--billing-${setup.status}-bg)`,
              color: `var(--billing-${setup.status}-fg)`,
            }}
          >
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {setup.collection_method === "stripe_becs"
                ? "BECS Direct Debit"
                : setup.collection_method === "stripe_card"
                  ? "Card"
                  : "Bank Transfer"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <BillingStatusBadge status={setup.status} />
              {setup.is_ccs_gap_fee_setup && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  CCS Gap Fee
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* ── Expanded Content ──────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border">
          {/* Mandate Info */}
          <div className="space-y-3 p-4">
            <div className="flex items-start gap-3 text-sm">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Account Holder
                </p>
                <p className="font-medium text-foreground">
                  {setup.account_holder_name}
                </p>
              </div>
            </div>

            {setup.mandate_id && (
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Mandate Accepted
                  </p>
                  <p className="font-medium text-foreground">
                    {setup.mandate_accepted_at
                      ? formatDate(setup.mandate_accepted_at)
                      : "Pending"}
                  </p>
                </div>
              </div>
            )}

            {setup.is_ccs_gap_fee_setup && setup.ccs_program_name && (
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  CCS Program
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {setup.ccs_program_name}
                </p>
              </div>
            )}

            {/* Update Payment Method button */}
            {setup.status === "active" && (
              <button
                onClick={handleUpdatePaymentMethod}
                disabled={isPending}
                className="mt-2 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors active-push touch-target disabled:opacity-50 hover:bg-secondary/80"
              >
                {isPending ? "Redirecting..." : "Update Payment Method"}
              </button>
            )}

            {setup.status === "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <p className="font-medium">Payment method issue</p>
                <p className="mt-1 opacity-75">
                  Recent payments have failed. Please update your payment method
                  or contact the school office.
                </p>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Payment History
              </h3>
            </div>

            {loadingHistory && (
              <p className="mt-3 text-sm text-muted-foreground">
                Loading...
              </p>
            )}

            {history && history.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No payment attempts yet.
              </p>
            )}

            {history && history.length > 0 && (
              <div className="mt-3 space-y-2">
                {history.slice(0, 10).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(attempt.amount_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(attempt.created_at)}
                        {attempt.attempt_number > 1 &&
                          ` (Attempt ${attempt.attempt_number})`}
                      </p>
                    </div>
                    <BillingStatusBadge status={attempt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
