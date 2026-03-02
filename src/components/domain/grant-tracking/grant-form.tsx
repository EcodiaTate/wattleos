// src/components/domain/grant-tracking/grant-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createGrant, updateGrant } from "@/lib/actions/grant-tracking";
import type { Grant } from "@/types/domain";
import type { CreateGrantInput } from "@/lib/validations/grant-tracking";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "acquitted", label: "Acquitted" },
  { value: "closed", label: "Closed" },
] as const;

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "capital", label: "Capital" },
  { value: "professional_dev", label: "Professional Development" },
  { value: "curriculum", label: "Curriculum" },
  { value: "technology", label: "Technology" },
  { value: "community", label: "Community" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
] as const;

interface GrantFormProps {
  grant?: Grant;
  staff: Array<{ id: string; name: string }>;
}

export function GrantForm({ grant, staff }: GrantFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(grant?.name ?? "");
  const [referenceNumber, setReferenceNumber] = useState(
    grant?.reference_number ?? "",
  );
  const [fundingBody, setFundingBody] = useState(grant?.funding_body ?? "");
  const [amountDollars, setAmountDollars] = useState(
    grant ? (grant.amount_cents / 100).toFixed(2) : "",
  );
  const [startDate, setStartDate] = useState(grant?.start_date ?? "");
  const [endDate, setEndDate] = useState(grant?.end_date ?? "");
  const [acquittalDueDate, setAcquittalDueDate] = useState(
    grant?.acquittal_due_date ?? "",
  );
  const [status, setStatus] = useState(grant?.status ?? "draft");
  const [category, setCategory] = useState(grant?.category ?? "general");
  const [managedByUserId, setManagedByUserId] = useState(
    grant?.managed_by_user_id ?? "",
  );
  const [description, setDescription] = useState(grant?.description ?? "");
  const [conditions, setConditions] = useState(grant?.conditions ?? "");
  const [internalNotes, setInternalNotes] = useState(
    grant?.internal_notes ?? "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amountDollars || "0") * 100);
    if (isNaN(amountCents) || amountCents < 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    startTransition(async () => {
      if (grant) {
        // Update - only send changed fields
        const result = await updateGrant({
          id: grant.id,
          name,
          reference_number: referenceNumber || null,
          funding_body: fundingBody,
          amount_cents: amountCents,
          start_date: startDate,
          end_date: endDate,
          acquittal_due_date: acquittalDueDate || null,
          status: status as CreateGrantInput["status"],
          category: category as CreateGrantInput["category"],
          managed_by_user_id: managedByUserId || null,
          description: description || null,
          conditions: conditions || null,
          internal_notes: internalNotes || null,
        });

        if (result.error) {
          setError(result.error.message);
          haptics.error();
          return;
        }

        haptics.success();
        router.push(`/admin/grant-tracking/${grant.id}`);
      } else {
        // Create
        const input: CreateGrantInput = {
          name,
          reference_number: referenceNumber || null,
          funding_body: fundingBody,
          amount_cents: amountCents,
          start_date: startDate,
          end_date: endDate,
          acquittal_due_date: acquittalDueDate || null,
          status: status as CreateGrantInput["status"],
          category: category as CreateGrantInput["category"],
          managed_by_user_id: managedByUserId || null,
          description: description || null,
          conditions: conditions || null,
          internal_notes: internalNotes || null,
        };

        const result = await createGrant(input);

        if (result.error) {
          setError(result.error.message);
          haptics.error();
          return;
        }

        haptics.success();
        router.push(`/admin/grant-tracking/${result.data!.id}`);
      }
    });
  }

  const inputStyle = {
    background: "var(--input)",
    color: "var(--foreground)",
  } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Grant Name */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Grant Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., AISWA Digital Learning Initiative"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      {/* Funding Body + Reference */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Funding Body *
          </label>
          <input
            type="text"
            value={fundingBody}
            onChange={(e) => setFundingBody(e.target.value)}
            required
            placeholder="e.g., Dept of Education"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Reference Number
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g., GRT-2026-001"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Amount (AUD) *
        </label>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-[var(--radius-md)] border border-border py-2 pl-7 pr-3 text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Status + Category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              haptics.selection();
              setStatus(e.target.value as typeof status);
            }}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Category
          </label>
          <select
            value={category}
            onChange={(e) => {
              haptics.selection();
              setCategory(e.target.value as typeof category);
            }}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Start Date *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            End Date *
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Acquittal Due
          </label>
          <input
            type="date"
            value={acquittalDueDate}
            onChange={(e) => setAcquittalDueDate(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Managed By */}
      {staff.length > 0 && (
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Managed By
          </label>
          <select
            value={managedByUserId}
            onChange={(e) => setManagedByUserId(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          >
            <option value="">Not assigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Purpose and scope of the grant…"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      {/* Conditions */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Funding Conditions
        </label>
        <textarea
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          rows={2}
          placeholder="Requirements or restrictions on use of funds…"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      {/* Internal Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Internal Notes
        </label>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          placeholder="Staff-only notes…"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Saving…" : grant ? "Update Grant" : "Create Grant"}
      </button>
    </form>
  );
}
