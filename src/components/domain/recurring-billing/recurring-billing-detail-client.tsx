"use client";

// ============================================================
// Recurring Billing Detail Client
// ============================================================
// Shows setup details, BECS mandate initiation, payment
// schedules, payment history, and cancellation.
// ============================================================

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  cancelRecurringBillingSetup,
  initiateBecsSetup,
  listRecurringBillingSchedules,
  listBillingPaymentAttempts,
} from "@/lib/actions/recurring-billing";
import { BillingStatusBadge } from "./billing-status-badge";
import { BillingPaymentMethodBadge } from "./billing-payment-method-badge";
import type {
  RecurringBillingSetupWithFamily,
  RecurringBillingSchedule,
  BillingPaymentAttemptWithSetup,
} from "@/types/domain";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  ExternalLink,
  History,
  Mail,
  Phone,
  RefreshCw,
  User,
  X,
} from "lucide-react";

interface RecurringBillingDetailClientProps {
  setup: RecurringBillingSetupWithFamily;
  permissions: string[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function RecurringBillingDetailClient({
  setup,
  permissions,
}: RecurringBillingDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [initiatingBecs, startBecsTransition] = useTransition();

  // Loaded data
  const [schedules, setSchedules] = useState<RecurringBillingSchedule[]>([]);
  const [attempts, setAttempts] = useState<BillingPaymentAttemptWithSetup[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const canManage = permissions.includes("MANAGE_RECURRING_BILLING");

  useEffect(() => {
    async function load() {
      const [schedResult, attemptsResult] = await Promise.all([
        listRecurringBillingSchedules(setup.id),
        listBillingPaymentAttempts({
          recurring_billing_setup_id: setup.id,
        }),
      ]);
      setSchedules(schedResult.data ?? []);
      setAttempts(attemptsResult.data ?? []);
      setLoadingData(false);
    }
    load();
  }, [setup.id]);

  const handleCancel = async () => {
    if (!canManage || !cancelReason.trim()) return;

    setCancelling(true);
    haptics.medium();

    try {
      const result = await cancelRecurringBillingSetup(setup.id, cancelReason);
      if (!result.error) {
        haptics.success();
        router.refresh();
        setShowCancelForm(false);
      } else {
        haptics.error();
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleInitiateBecs = () => {
    haptics.medium();
    startBecsTransition(async () => {
      const result = await initiateBecsSetup(
        setup.id,
        window.location.origin,
      );
      if (result.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
      }
    });
  };

  const needsMandate =
    setup.collection_method === "stripe_becs" &&
    !setup.mandate_id &&
    setup.status !== "cancelled";

  return (
    <div className="space-y-6">
      {/* ── Setup Overview ────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <BillingStatusBadge status={setup.status} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Collection Method
              </p>
              <p className="mt-2">
                <BillingPaymentMethodBadge method={setup.collection_method} />
              </p>
            </div>

            {setup.is_ccs_gap_fee_setup && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  CCS Program
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {setup.ccs_program_name}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Setup Created
              </p>
              <p className="mt-2 font-medium text-foreground">
                {new Date(setup.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {canManage && setup.status !== "cancelled" && (
            <button
              onClick={() => {
                haptics.light();
                setShowCancelForm(!showCancelForm);
              }}
              className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-950 dark:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── BECS Mandate Setup (if needed) ─────────────────────── */}
      {needsMandate && canManage && (
        <div
          className="rounded-lg border p-6"
          style={{
            borderColor: "var(--billing-pending-fg)",
            backgroundColor: "var(--billing-pending-bg)",
          }}
        >
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: "var(--billing-pending-fg)" }} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                BECS Direct Debit Mandate Required
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The account holder needs to accept a direct debit mandate before
                collections can begin. Click below to redirect to the Stripe
                hosted mandate acceptance page.
              </p>
              <button
                onClick={handleInitiateBecs}
                disabled={initiatingBecs}
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all active-push touch-target disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                {initiatingBecs ? "Redirecting..." : "Send to Stripe for Mandate Acceptance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Form ───────────────────────────────────────── */}
      {showCancelForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <h3 className="font-semibold text-red-900 dark:text-red-100">
            Cancel Recurring Billing Setup
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-200">
            This will immediately stop all scheduled collections for this family.
          </p>

          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation..."
            className="mt-4 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-700 dark:bg-red-950"
            rows={3}
          />

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelling}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 hover:bg-red-700"
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
            <button
              onClick={() => {
                setShowCancelForm(false);
                setCancelReason("");
              }}
              className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              Keep Active
            </button>
          </div>
        </div>
      )}

      {/* ── Account Holder Details ────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Account Holder</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Name
              </p>
              <p className="font-medium text-foreground">
                {setup.account_holder_name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="font-medium text-foreground">
                {setup.account_holder_email}
              </p>
            </div>
          </div>

          {setup.account_holder_phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Phone
                </p>
                <p className="font-medium text-foreground">
                  {setup.account_holder_phone}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mandate Details (if accepted) ──────────────────────── */}
      {setup.mandate_id && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Direct Debit Mandate</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Mandate ID
              </p>
              <p className="mt-1 font-mono text-foreground">
                {setup.mandate_id}
              </p>
            </div>

            {setup.mandate_accepted_at && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Accepted
                  </p>
                  <p className="font-medium text-foreground">
                    {new Date(setup.mandate_accepted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {setup.stripe_payment_method_id && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Payment Method
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {setup.stripe_payment_method_id}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Collection Schedules ──────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Collection Schedules</h2>
        </div>

        {loadingData && (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        )}

        {!loadingData && schedules.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No collection schedules configured yet.
          </p>
        )}

        {!loadingData && schedules.length > 0 && (
          <div className="mt-4 space-y-2">
            {schedules.map((sched) => (
              <div
                key={sched.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {sched.description || sched.invoice_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Collects on day {sched.collection_day_of_month} of each month
                  </p>
                </div>
                <div className="text-right">
                  {sched.fixed_amount_cents ? (
                    <p className="font-semibold text-foreground">
                      {formatCurrency(sched.fixed_amount_cents)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Invoice amount
                    </p>
                  )}
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: sched.is_active
                        ? "var(--billing-active-bg)"
                        : "var(--billing-paused-bg)",
                      color: sched.is_active
                        ? "var(--billing-active-fg)"
                        : "var(--billing-paused-fg)",
                    }}
                  >
                    {sched.is_active ? "Active" : "Paused"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Auto-Retry Settings ───────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Auto-Retry Settings</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-retry enabled</span>
            <span className="font-medium text-foreground">
              {setup.auto_retry_enabled ? "Yes" : "No"}
            </span>
          </div>
          {setup.auto_retry_enabled && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max attempts</span>
                <span className="font-medium text-foreground">
                  {setup.max_retry_attempts}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retry interval</span>
                <span className="font-medium text-foreground">
                  {setup.retry_interval_days} days
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Payment History ────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Payment History</h2>
        </div>

        {loadingData && (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        )}

        {!loadingData && attempts.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No payment attempts yet.
          </p>
        )}

        {!loadingData && attempts.length > 0 && (
          <div className="mt-4 space-y-2">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {formatCurrency(attempt.amount_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(attempt.created_at).toLocaleDateString()}
                    {attempt.attempt_number > 1 &&
                      ` · Attempt ${attempt.attempt_number}`}
                  </p>
                  {attempt.failure_message && (
                    <p className="mt-1 text-xs" style={{ color: "var(--billing-failed-fg)" }}>
                      {attempt.failure_message}
                    </p>
                  )}
                </div>
                <BillingStatusBadge status={attempt.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Cancellation Info (if cancelled) ───────────────────── */}
      {setup.status === "cancelled" && setup.cancelled_at && (
        <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-200" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">
              Setup cancelled on{" "}
              {new Date(setup.cancelled_at).toLocaleDateString()}
            </p>
            {setup.cancellation_reason && (
              <p className="mt-1 opacity-75">{setup.cancellation_reason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
