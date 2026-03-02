"use client";

// ============================================================
// Recurring Billing Setup Form Client
// ============================================================
// Form to create a new direct debit setup.
// Collects: family, collection method, account holder details.
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createRecurringBillingSetup } from "@/lib/actions/recurring-billing";
import type { CreateRecurringBillingSetupInput } from "@/lib/validations/recurring-billing";
import { CreditCard, AlertCircle } from "lucide-react";

export function RecurringBillingSetupFormClient() {
  const router = useRouter();
  const haptics = useHaptics();

  const [familyId, setFamilyId] = useState("");
  const [collectionMethod, setCollectionMethod] =
    useState<"stripe_becs" | "stripe_card" | "manual_bank_transfer">(
      "stripe_becs"
    );
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountHolderEmail, setAccountHolderEmail] = useState("");
  const [accountHolderPhone, setAccountHolderPhone] = useState("");
  const [isCcsBilling, setIsCcsBilling] = useState(false);
  const [ccsProgramName, setCcsProgramName] = useState("");
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [maxRetryAttempts, setMaxRetryAttempts] = useState(3);
  const [retryIntervalDays, setRetryIntervalDays] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      haptics.medium();

      const input: CreateRecurringBillingSetupInput = {
        tenant_id: "", // Will be filled by server action
        family_id: familyId,
        collection_method: collectionMethod,
        account_holder_name: accountHolderName,
        account_holder_email: accountHolderEmail,
        account_holder_phone: accountHolderPhone || null,
        is_ccs_gap_fee_setup: isCcsBilling,
        ccs_program_name: isCcsBilling ? ccsProgramName : null,
        auto_retry_enabled: autoRetryEnabled,
        max_retry_attempts: maxRetryAttempts,
        retry_interval_days: retryIntervalDays,
      };

      const result = await createRecurringBillingSetup(input);

      if (result.error) {
        haptics.error();
        setError(result.error.message);
        return;
      }

      haptics.success();
      router.push(`/admin/recurring-billing/${result.data!.id}`);
    } catch (err) {
      haptics.error();
      setError("Failed to create setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* ── Family Selection ──────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <label className="block text-sm font-medium text-foreground">
          Family *
        </label>
        <input
          type="text"
          placeholder="Family UUID"
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      {/* ── Collection Method ─────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <label className="block text-sm font-medium text-foreground">
          Collection Method *
        </label>
        <div className="mt-4 space-y-3">
          {(
            [
              "stripe_becs",
              "stripe_card",
              "manual_bank_transfer",
            ] as const
          ).map((method) => (
            <label
              key={method}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="method"
                value={method}
                checked={collectionMethod === method}
                onChange={(e) =>
                  setCollectionMethod(
                    e.target.value as typeof collectionMethod
                  )
                }
                className="h-4 w-4"
              />
              <span className="text-sm text-foreground">
                {method === "stripe_becs"
                  ? "Stripe BECS Direct Debit"
                  : method === "stripe_card"
                    ? "Stripe Card"
                    : "Manual Bank Transfer"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Account Holder Details ────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-medium text-foreground">Account Holder</h3>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Name *
          </label>
          <input
            type="text"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Email *
          </label>
          <input
            type="email"
            value={accountHolderEmail}
            onChange={(e) => setAccountHolderEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Phone
          </label>
          <input
            type="tel"
            value={accountHolderPhone}
            onChange={(e) => setAccountHolderPhone(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* ── CCS Gap Fee Setup ──────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isCcsBilling}
            onChange={(e) => setIsCcsBilling(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-foreground">
            CCS Gap Fee Billing
          </span>
        </label>

        {isCcsBilling && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground">
              Program Name
            </label>
            <input
              type="text"
              value={ccsProgramName}
              onChange={(e) => setCcsProgramName(e.target.value)}
              placeholder="e.g., 2-year-old room"
              className="mt-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* ── Auto Retry Config ─────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-medium text-foreground">Auto-Retry Settings</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRetryEnabled}
            onChange={(e) => setAutoRetryEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-foreground">
            Enable automatic retries on failure
          </span>
        </label>

        {autoRetryEnabled && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Max Retry Attempts ({maxRetryAttempts})
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxRetryAttempts}
                onChange={(e) => setMaxRetryAttempts(parseInt(e.target.value))}
                className="mt-2 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Retry Interval ({retryIntervalDays} days)
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={retryIntervalDays}
                onChange={(e) => setRetryIntervalDays(parseInt(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </>
        )}
      </div>

      {/* ── Error Message ─────────────────────────────────────── */}
      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Submit Button ─────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-all active-push touch-target disabled:opacity-50"
          onClick={() => !loading && haptics.medium()}
        >
          {loading ? "Creating..." : "Create Setup"}
        </button>
      </div>
    </form>
  );
}
