// src/components/domain/debt/payment-plan-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DebtCollectionRecordWithDetails, DebtPaymentPlanItem, DebtPaymentPlanWithItems } from "@/types/domain";
import { createPaymentPlan, recordInstallmentPayment, updatePaymentPlan } from "@/lib/actions/debt";
import { useHaptics } from "@/lib/hooks/use-haptics";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── New plan form ─────────────────────────────────────────────

interface CreatePlanProps {
  record: DebtCollectionRecordWithDetails;
}

export function CreatePaymentPlanClient({ record }: CreatePlanProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const outstanding = record.invoice
    ? record.invoice.total_cents - record.invoice.amount_paid_cents
    : record.outstanding_cents;

  const [form, setForm] = useState({
    total_agreed_cents: outstanding,
    frequency: "fortnightly" as "weekly" | "fortnightly" | "monthly",
    installment_count: 4,
    first_due_date: new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0],
    guardian_agreed: false,
    terms_notes: "",
  });

  function handleChange(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const perInstallment = form.installment_count > 0
    ? Math.ceil(form.total_agreed_cents / form.installment_count)
    : 0;

  function handleSubmit() {
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await createPaymentPlan({
        collection_stage_id: record.id,
        invoice_id: record.invoice_id,
        total_agreed_cents: form.total_agreed_cents,
        frequency: form.frequency,
        installment_count: form.installment_count,
        first_due_date: form.first_due_date,
        guardian_agreed: form.guardian_agreed,
        terms_notes: form.terms_notes || null,
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        router.push(`/admin/debt/${record.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-tab-bar" style={{ maxWidth: 560 }}>
      <div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)" }}>
          Create Payment Plan
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
          {record.student ? `${record.student.first_name} ${record.student.last_name}` : ""}
          {record.invoice && ` · Invoice ${record.invoice.invoice_number}`}
          {` · Outstanding: ${formatCents(outstanding)}`}
        </p>
      </div>

      {error && (
        <div style={{ padding: "0.65rem 1rem", borderRadius: "var(--radius)", background: "var(--debt-overdue-bg)", color: "var(--debt-overdue-fg)", fontSize: "0.84rem" }}>
          {error}
        </div>
      )}

      <FormCard>
        <FormField label="Total Agreed Amount">
          <input
            type="number"
            value={form.total_agreed_cents / 100}
            onChange={e => handleChange("total_agreed_cents", Math.round(parseFloat(e.target.value) * 100))}
            min={0}
            step={0.01}
            style={inputStyle}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
            Enter amount in dollars (e.g. 240.00)
          </p>
        </FormField>

        <FormField label="Payment Frequency">
          <select
            value={form.frequency}
            onChange={e => handleChange("frequency", e.target.value)}
            style={inputStyle}
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
        </FormField>

        <FormField label="Number of Instalments">
          <input
            type="number"
            value={form.installment_count}
            onChange={e => handleChange("installment_count", parseInt(e.target.value, 10))}
            min={1}
            max={52}
            style={inputStyle}
          />
          {perInstallment > 0 && (
            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>
              ≈ {formatCents(perInstallment)} per instalment
            </p>
          )}
        </FormField>

        <FormField label="First Payment Due">
          <input
            type="date"
            value={form.first_due_date}
            onChange={e => handleChange("first_due_date", e.target.value)}
            style={inputStyle}
          />
        </FormField>

        <FormField label="Terms Notes (optional)">
          <textarea
            value={form.terms_notes}
            onChange={e => handleChange("terms_notes", e.target.value)}
            rows={3}
            placeholder="Any agreed conditions or notes…"
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </FormField>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <input
            type="checkbox"
            id="guardian_agreed"
            checked={form.guardian_agreed}
            onChange={e => handleChange("guardian_agreed", e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <label htmlFor="guardian_agreed" style={{ fontSize: "0.85rem", color: "var(--foreground)", cursor: "pointer" }}>
            Guardian has agreed to this plan
          </label>
        </div>
      </FormCard>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={handleSubmit}
          disabled={isPending || form.total_agreed_cents <= 0 || form.installment_count < 1}
          className="touch-target active-push"
          style={{
            padding: "0.55rem 1.25rem",
            borderRadius: "var(--radius)",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: "0.85rem",
            fontWeight: 600,
            border: "none",
            cursor: isPending ? "wait" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Creating…" : "Create Payment Plan"}
        </button>
        <button
          onClick={() => router.back()}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius)",
            background: "var(--card)",
            color: "var(--muted-foreground)",
            fontSize: "0.85rem",
            border: "1px solid var(--border)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Plan detail ───────────────────────────────────────────────

interface PlanDetailProps {
  plan: DebtPaymentPlanWithItems;
  canManage: boolean;
}

export function PaymentPlanDetailClient({ plan, canManage }: PlanDetailProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payingItemId, setPayingItemId] = useState<string | null>(null);

  function handleMarkPaid(item: DebtPaymentPlanItem) {
    haptics.impact("medium");
    setPayingItemId(item.id);
    startTransition(async () => {
      const result = await recordInstallmentPayment({
        item_id: item.id,
        paid_amount_cents: item.amount_cents,
        payment_id: null,
        notes: null,
      });
      setPayingItemId(null);
      if (result.error) {
        setError(result.error.message);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccess("Instalment marked as paid");
        setTimeout(() => setSuccess(null), 3000);
        router.refresh();
      }
    });
  }

  const ITEM_STATUS_TOKEN: Record<string, string> = {
    pending: "debt-installment-pending",
    paid: "debt-installment-paid",
    missed: "debt-installment-missed",
    waived: "debt-installment-waived",
  };

  const isActive = plan.status === "active";

  return (
    <div className="flex flex-col gap-5 pb-tab-bar">
      <div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)" }}>
          Payment Plan
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
          {plan.frequency.charAt(0).toUpperCase() + plan.frequency.slice(1)} instalments ·{" "}
          {plan.items.length} total
        </p>
      </div>

      {error && (
        <div style={{ padding: "0.65rem 1rem", borderRadius: "var(--radius)", background: "var(--debt-overdue-bg)", color: "var(--debt-overdue-fg)", fontSize: "0.84rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "0.65rem 1rem", borderRadius: "var(--radius)", background: "var(--debt-resolved-bg)", color: "var(--debt-resolved-fg)", fontSize: "0.84rem" }}>
          {success}
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1rem 1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>Progress</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)" }}>
            {formatCents(plan.total_paid_cents)} of {formatCents(plan.total_agreed_cents)}
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: "var(--muted)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (plan.total_paid_cents / plan.total_agreed_cents) * 100)}%`,
              background: "var(--debt-installment-paid)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.35rem" }}>
          {formatCents(plan.total_remaining_cents)} remaining
        </p>
      </div>

      {/* Instalment table */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {plan.items.map((item, i) => {
          const token = ITEM_STATUS_TOKEN[item.status] ?? "debt-installment-pending";
          const isNext = plan.next_due_item?.id === item.id;
          return (
            <div
              key={item.id}
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: i < plan.items.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: isNext ? "var(--muted)" : "transparent",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted-foreground)", minWidth: 28 }}>
                #{item.installment_number}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--foreground)" }}>
                  {formatCents(item.amount_cents)}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                  Due {formatDate(item.due_date)}
                  {item.paid_at && ` · Paid ${formatDate(item.paid_at)}`}
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "0.15rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  background: `var(--${token}-bg, var(--muted))`,
                  color: `var(--${token}-fg, var(--muted-foreground))`,
                }}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
              {canManage && isActive && item.status === "pending" && (
                <button
                  onClick={() => handleMarkPaid(item)}
                  disabled={isPending && payingItemId === item.id}
                  className="touch-target active-push"
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius)",
                    background: "var(--debt-installment-paid)",
                    color: "var(--debt-installment-paid-fg)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Mark Paid
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Plan terms */}
      {plan.terms_notes && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "0.9rem 1.25rem",
          }}
        >
          <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: "0.4rem" }}>
            Terms
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
            {plan.terms_notes}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Shared form helpers ───────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: "0.85rem",
  outline: "none",
};

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)" }}>{label}</label>
      {children}
    </div>
  );
}
