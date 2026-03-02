// src/components/domain/debt/write-off-form-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  DebtCollectionRecordWithDetails,
  DebtWriteOffReason,
} from "@/types/domain";
import { requestWriteOff } from "@/lib/actions/debt";
import { useHaptics } from "@/lib/hooks/use-haptics";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(c / 100);
}

const REASON_OPTIONS: { value: DebtWriteOffReason; label: string }[] = [
  { value: "uncollectable", label: "Uncollectable - debtor cannot be located" },
  { value: "hardship", label: "Genuine financial hardship" },
  { value: "dispute_resolved", label: "Dispute resolved - amount waived" },
  { value: "deceased", label: "Guardian is deceased" },
  { value: "relocated", label: "Family has relocated overseas" },
  { value: "statute_barred", label: "Statute barred (>6 years)" },
  { value: "other", label: "Other (explain in notes)" },
];

interface Props {
  record: DebtCollectionRecordWithDetails;
}

export function WriteOffFormClient({ record }: Props) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const outstanding = record.invoice
    ? record.invoice.total_cents - record.invoice.amount_paid_cents
    : record.outstanding_cents;

  const [form, setForm] = useState({
    write_off_amount_cents: outstanding,
    reason: "" as DebtWriteOffReason | "",
    reason_notes: "",
    write_off_reference: "",
    confirmed: false,
  });

  function handleChange(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.reason) return;
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await requestWriteOff({
        collection_stage_id: record.id,
        invoice_id: record.invoice_id,
        write_off_amount_cents: form.write_off_amount_cents,
        reason: form.reason as DebtWriteOffReason,
        reason_notes: form.reason_notes || null,
        write_off_reference: form.write_off_reference || null,
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        router.push(`/admin/debt/${record.id}`);
        router.refresh();
      }
    });
  }

  const canSubmit =
    form.reason !== "" && form.confirmed && form.write_off_amount_cents > 0;

  return (
    <div className="flex flex-col gap-5 pb-tab-bar" style={{ maxWidth: 540 }}>
      <div>
        <h1
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--foreground)",
          }}
        >
          Process Write-Off
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
          {record.student
            ? `${record.student.first_name} ${record.student.last_name}`
            : ""}
          {record.invoice && ` · Invoice ${record.invoice.invoice_number}`}
        </p>
      </div>

      {/* Warning banner */}
      <div
        style={{
          padding: "0.85rem 1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--debt-escalated)",
          background: "var(--debt-escalated-bg)",
          color: "var(--debt-escalated-fg)",
          fontSize: "0.84rem",
          lineHeight: 1.55,
        }}
      >
        <strong>This action is irreversible.</strong> The invoice will be voided
        and the debt will be closed. This action is recorded in the audit log
        with your name and the approval timestamp.
      </div>

      {error && (
        <div
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "var(--radius)",
            background: "var(--debt-overdue-bg)",
            color: "var(--debt-overdue-fg)",
            fontSize: "0.84rem",
          }}
        >
          {error}
        </div>
      )}

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
        {/* Outstanding summary */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0.65rem 0.9rem",
            borderRadius: "var(--radius)",
            background: "var(--muted)",
          }}
        >
          <span
            style={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}
          >
            Outstanding Balance
          </span>
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            {formatCents(outstanding)}
          </span>
        </div>

        <FormField label="Amount to Write Off ($)">
          <input
            type="number"
            value={form.write_off_amount_cents / 100}
            onChange={(e) =>
              handleChange(
                "write_off_amount_cents",
                Math.round(parseFloat(e.target.value) * 100),
              )
            }
            min={0.01}
            max={outstanding / 100}
            step={0.01}
            style={inputStyle}
          />
        </FormField>

        <FormField label="Reason">
          <select
            value={form.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            style={inputStyle}
          >
            <option value="">Select a reason…</option>
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Additional Notes">
          <textarea
            value={form.reason_notes}
            onChange={(e) => handleChange("reason_notes", e.target.value)}
            rows={3}
            placeholder="Supporting detail for the write-off decision…"
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </FormField>

        <FormField label="Write-Off Reference (optional)">
          <input
            type="text"
            value={form.write_off_reference}
            onChange={(e) =>
              handleChange("write_off_reference", e.target.value)
            }
            placeholder="e.g. WO-2026-001 or accounting reference"
            style={inputStyle}
          />
        </FormField>

        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius)",
            background: "var(--debt-overdue-bg)",
            border: "1px solid var(--debt-overdue)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => handleChange("confirmed", e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: "0.84rem",
                color: "var(--foreground)",
                lineHeight: 1.5,
              }}
            >
              I confirm I have authority to write off this debt and understand
              that this action is permanent and will be recorded in the audit
              log.
            </span>
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="touch-target active-push"
          style={{
            padding: "0.55rem 1.25rem",
            borderRadius: "var(--radius)",
            background: canSubmit ? "var(--debt-overdue)" : "var(--muted)",
            color: canSubmit
              ? "var(--debt-overdue-fg)"
              : "var(--muted-foreground)",
            fontSize: "0.85rem",
            fontWeight: 600,
            border: "none",
            cursor: !canSubmit || isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Processing…" : "Approve Write-Off"}
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "var(--foreground)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
