"use client";

// ============================================================
// Recurring Billing Dashboard Client
// ============================================================
// Displays overview of direct debit setups, payment methods,
// failed collections, and upcoming scheduled collections.
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { Plus, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { BillingStatusBadge } from "./billing-status-badge";
import { BillingPaymentMethodBadge } from "./billing-payment-method-badge";
import type { RecurringBillingDashboardData } from "@/types/domain";

interface RecurringBillingDashboardClientProps {
  data: RecurringBillingDashboardData;
  permissions: string[];
}

export function RecurringBillingDashboardClient({
  data,
  permissions,
}: RecurringBillingDashboardClientProps) {
  const haptics = useHaptics();
  const [filter, setFilter] = useState<"all" | "active" | "failed">("all");

  const canManage = permissions.includes("MANAGE_RECURRING_BILLING");

  const failedAmountDisplay = (data.total_failed_amount_cents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Setups */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Setups
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {data.total_setups}
              </p>
            </div>
            <Activity
              className="h-8 w-8 opacity-50"
              style={{ color: "var(--billing-active)" }}
            />
          </div>
        </div>

        {/* Active Setups */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {data.active_setups}
              </p>
            </div>
            <TrendingUp
              className="h-8 w-8 opacity-50"
              style={{ color: "var(--billing-active)" }}
            />
          </div>
        </div>

        {/* Failed Setups */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {data.failed_setups}
              </p>
            </div>
            <AlertTriangle
              className="h-8 w-8 opacity-50"
              style={{ color: "var(--billing-failed)" }}
            />
          </div>
        </div>

        {/* Failed Amount (Last 30d) */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Failed (30d)
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              ${failedAmountDisplay}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.failed_payments_last_30d} failures
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters + New Button ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["all", "active", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                haptics.light();
                setFilter(f);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Failed"}
            </button>
          ))}
        </div>

        {canManage && (
          <Link
            href="/admin/recurring-billing/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all active-push touch-target hover:bg-primary/90"
            onClick={() => haptics.medium()}
          >
            <Plus className="h-4 w-4" />
            New Setup
          </Link>
        )}
      </div>

      {/* ── Method Breakdown ────────────────────────────────────── */}
      {data.setups_by_method.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">Collection Methods</h2>
          <div className="mt-4 space-y-2">
            {data.setups_by_method.map((m) => (
              <div
                key={m.method}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  <BillingPaymentMethodBadge method={m.method} />
                </span>
                <span className="font-medium text-foreground">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Payment Attempts ─────────────────────────────── */}
      {data.recent_payment_attempts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">Recent Payment Attempts</h2>
          <div className="mt-4 space-y-3">
            {data.recent_payment_attempts.slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    ${(attempt.amount_cents / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Attempt {attempt.attempt_number}
                  </p>
                </div>
                <BillingStatusBadge status={attempt.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────── */}
      {data.total_setups === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 opacity-25" />
          <p className="mt-4 text-sm text-muted-foreground">
            No recurring billing setups yet
          </p>
          {canManage && (
            <Link
              href="/admin/recurring-billing/new"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              onClick={() => haptics.medium()}
            >
              Create your first setup
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
