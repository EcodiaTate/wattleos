// src/components/domain/programs/program-form.tsx

"use client";

import type {
  CreateProgramInput,
  DayOfWeek,
  Program,
  UpdateProgramInput,
} from "@/lib/actions/programs/programs";
import {
  BILLING_TYPES,
  DAYS_OF_WEEK,
  PROGRAM_TYPES,
} from "@/lib/constants/programs";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ============================================================
// Types
// ============================================================

interface ProgramFormProps {
  program?: Program;
  // Fixed TS Error: Use a more generic input type that handles both create/update
  onSubmit: (
    input: any, 
  ) => Promise<{ data: Program | null; error: { message: string } | null }>;
}

export function ProgramForm({ program, onSubmit }: ProgramFormProps) {
  const router = useRouter();
  const isEdit = !!program;

  // Form state
  const [name, setName] = useState(program?.name ?? "");
  const [code, setCode] = useState(program?.code ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [minAgeMonths, setMinAgeMonths] = useState<string>(
    program?.min_age_months != null ? String(program.min_age_months) : "",
  );
  const [maxAgeMonths, setMaxAgeMonths] = useState<string>(
    program?.max_age_months != null ? String(program.max_age_months) : "",
  );
  const [defaultStartTime, setDefaultStartTime] = useState(
    program?.default_start_time ?? "",
  );
  const [defaultEndTime, setDefaultEndTime] = useState(
    program?.default_end_time ?? "",
  );
  const [defaultDays, setDefaultDays] = useState<DayOfWeek[]>(
    program?.default_days ?? [],
  );
  const [maxCapacity, setMaxCapacity] = useState<string>(
    program?.max_capacity != null ? String(program.max_capacity) : "",
  );
  const [sessionFeeCents, setSessionFeeCents] = useState<string>(
    program ? String(program.session_fee_cents / 100) : "",
  );
  const [casualFeeCents, setCasualFeeCents] = useState<string>(
    program?.casual_fee_cents != null
      ? String(program.casual_fee_cents / 100)
      : "",
  );
  const [programType, setProgramType] = useState<string>(
    program?.program_type ?? "after_school_care",
  );
  const [billingType, setBillingType] = useState<string>(
    program?.billing_type ?? "per_session",
  );
  const [cancellationNoticeHours, setCancellationNoticeHours] =
    useState<string>(
      program ? String(program.cancellation_notice_hours) : "24",
    );
  const [lateCancelFeeCents, setLateCancelFeeCents] = useState<string>(
    program ? String(program.late_cancel_fee_cents / 100) : "0",
  );
  const [ccsEligible, setCcsEligible] = useState(
    program?.ccs_eligible ?? false,
  );
  const [ccsActivityType, setCcsActivityType] = useState(
    program?.ccs_activity_type ?? "",
  );
  const [ccsServiceId, setCcsServiceId] = useState(
    program?.ccs_service_id ?? "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: DayOfWeek) {
    setDefaultDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input = {
        name,
        code: code.trim() || null,
        program_type: programType,
        description: description.trim() || null,
        min_age_months: minAgeMonths ? parseInt(minAgeMonths, 10) : null,
        max_age_months: maxAgeMonths ? parseInt(maxAgeMonths, 10) : null,
        default_start_time: defaultStartTime || null,
        default_end_time: defaultEndTime || null,
        default_days: defaultDays,
        max_capacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        session_fee_cents: dollarsToCents(sessionFeeCents),
        casual_fee_cents: casualFeeCents ? dollarsToCents(casualFeeCents) : null,
        billing_type: billingType,
        cancellation_notice_hours: cancellationNoticeHours ? parseInt(cancellationNoticeHours, 10) : 24,
        late_cancel_fee_cents: dollarsToCents(lateCancelFeeCents),
        ccs_eligible: ccsEligible,
        ccs_activity_type: ccsActivityType.trim() || null,
        ccs_service_id: ccsServiceId.trim() || null,
      };

      const result = await onSubmit(input);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (result.data) {
        router.push(`/programs/${result.data.id}`);
      } else {
        router.push("/programs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Design System Classes
  const inputCls =
    "w-full rounded-[var(--radius-sm)] border border-[var(--input)] bg-[var(--card)] px-[var(--density-input-padding-x)] h-[var(--density-input-height)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:bg-[var(--input-disabled-bg)] disabled:text-[var(--input-disabled-fg)] transition-colors";
  const labelCls = "block text-sm font-semibold text-[var(--form-label-fg)] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--density-section-gap)]">
      {error && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--destructive)] bg-[var(--form-error-bg)] p-3 text-sm text-[var(--form-error-fg)] animate-shake">
          {error}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-base font-bold text-[var(--foreground)]">Basic Information</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={labelCls}>
              Program Name <span className="text-[var(--form-required-indicator)]">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. After School Care"
              className={inputCls}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="code" className={labelCls}>Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ASC"
              className={inputCls}
              disabled={submitting}
            />
            <p className="mt-1.5 text-xs text-[var(--form-helper-fg)]">Short code for internal reference</p>
          </div>

          <div>
            <label htmlFor="program_type" className={labelCls}>
              Program Type <span className="text-[var(--form-required-indicator)]">*</span>
            </label>
            <select
              id="program_type"
              value={programType}
              onChange={(e) => setProgramType(e.target.value)}
              className={inputCls}
              disabled={submitting}
            >
              {PROGRAM_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelCls}>Description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description shown to parents..."
              className={`${inputCls} h-auto py-2`}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-bold text-[var(--foreground)]">Schedule</legend>
        
        <div>
          <label className={labelCls}>Default Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = defaultDays.includes(day.value as DayOfWeek);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value as DayOfWeek)}
                  disabled={submitting}
                  className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--primary-300)]"
                  } disabled:opacity-50`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="start_time" className={labelCls}>Default Start Time</label>
            <input
              id="start_time"
              type="time"
              value={defaultStartTime}
              onChange={(e) => setDefaultStartTime(e.target.value)}
              className={inputCls}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="end_time" className={labelCls}>Default End Time</label>
            <input
              id="end_time"
              type="time"
              value={defaultEndTime}
              onChange={(e) => setDefaultEndTime(e.target.value)}
              className={inputCls}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="max_capacity" className={labelCls}>Max Capacity</label>
            <input
              id="max_capacity"
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-bold text-[var(--foreground)]">Pricing & Billing</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="billing_type" className={labelCls}>Billing Type</label>
            <select
              id="billing_type"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value)}
              className={inputCls}
              disabled={submitting}
            >
              {BILLING_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{bt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="session_fee" className={labelCls}>Session Fee ($)</label>
            <input
              id="session_fee"
              type="number"
              step="0.01"
              value={sessionFeeCents}
              onChange={(e) => setSessionFeeCents(e.target.value)}
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] px-4 h-[var(--density-button-height)] text-sm font-bold text-[var(--muted-foreground)] hover:bg-[var(--hover-overlay)] transition-colors"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-6 h-[var(--density-button-height)] text-sm font-bold text-[var(--primary-foreground)] hover:opacity-90 shadow-[var(--shadow-primary)] transition-all disabled:opacity-50"
        >
          {submitting ? "Processing..." : isEdit ? "Save Changes" : "Create Program"}
        </button>
      </div>
    </form>
  );
}