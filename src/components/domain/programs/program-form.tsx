// src/components/domain/programs/program-form.tsx
//
// ============================================================
// WattleOS V2 - Program Create/Edit Form
// ============================================================
// Client component used by both /programs/new and /programs/[id]/edit.
// Contains the full program configuration form with sections
// for basic info, schedule, pricing, eligibility, and CCS.
//
// WHY client component: Multi-field interactive form with
// checkbox groups (days of week), conditional CCS section,
// and form submission with loading state. Server action is
// called from the client via the passed-in onSubmit handler.
// ============================================================

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
  /** Existing program for edit mode. Omit for create mode. */
  program?: Program;
  /** Server action to call on submit */
  onSubmit: (
    input: CreateProgramInput | UpdateProgramInput,
  ) => Promise<{ data: Program | null; error: { message: string } | null }>;
}

// ============================================================
// Component
// ============================================================

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
  const [programType, setProgramType] = useState<CreateProgramInput["program_type"]>(
    program?.program_type ?? "after_school_care",
  );
  
  const [billingType, setBillingType] = useState<CreateProgramInput["billing_type"]>(
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

  // Day toggle handler
  function toggleDay(day: DayOfWeek) {
    setDefaultDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  // Dollar string → cents integer
  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input: CreateProgramInput = {
        name,
        code: code.trim() || null,
        program_type: programType as CreateProgramInput["program_type"],
        description: description.trim() || null,
        min_age_months: minAgeMonths ? parseInt(minAgeMonths, 10) : null,
        max_age_months: maxAgeMonths ? parseInt(maxAgeMonths, 10) : null,
        default_start_time: defaultStartTime || null,
        default_end_time: defaultEndTime || null,
        default_days: defaultDays,
        max_capacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        session_fee_cents: dollarsToCents(sessionFeeCents),
        casual_fee_cents: casualFeeCents
          ? dollarsToCents(casualFeeCents)
          : null,
        billing_type: billingType as CreateProgramInput["billing_type"],
        cancellation_notice_hours: cancellationNoticeHours
          ? parseInt(cancellationNoticeHours, 10)
          : 24,
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

      // Navigate to the program detail page
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

  // Common input classes
  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-50 disabled:text-gray-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ============================================ */}
      {/* Section 1: Basic Info                        */}
      {/* ============================================ */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900">
          Basic Information
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label htmlFor="name" className={labelCls}>
              Program Name <span className="text-red-500">*</span>
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

          {/* Code */}
          <div>
            <label htmlFor="code" className={labelCls}>
              Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ASC"
              className={inputCls}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-400">
              Short code for internal reference
            </p>
          </div>

          {/* Type */}
          <div>
            <label htmlFor="program_type" className={labelCls}>
              Program Type <span className="text-red-500">*</span>
            </label>
            <select
  id="program_type"
  value={programType}
  onChange={(e) =>
    setProgramType(e.target.value as CreateProgramInput["program_type"])
  }
  className={inputCls}
  disabled={submitting}
>
              {PROGRAM_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelCls}>
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description shown to parents when browsing programs"
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      {/* ============================================ */}
      {/* Section 2: Schedule                          */}
      {/* ============================================ */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900">
          Schedule
        </legend>

        {/* Days of week */}
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
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-amber-400 hover:bg-amber-50"
                  } disabled:opacity-50`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Days sessions are generated on. Parents can only book recurring
            patterns for these days.
          </p>
        </div>

        {/* Times */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="start_time" className={labelCls}>
              Default Start Time
            </label>
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
            <label htmlFor="end_time" className={labelCls}>
              Default End Time
            </label>
            <input
              id="end_time"
              type="time"
              value={defaultEndTime}
              onChange={(e) => setDefaultEndTime(e.target.value)}
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="max_capacity" className={labelCls}>
              Max Capacity
            </label>
            <input
              id="max_capacity"
              type="number"
              min="1"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              placeholder="Leave blank for unlimited"
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      {/* ============================================ */}
      {/* Section 3: Eligibility                       */}
      {/* ============================================ */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900">
          Eligibility
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="min_age" className={labelCls}>
              Minimum Age (months)
            </label>
            <input
              id="min_age"
              type="number"
              min="0"
              value={minAgeMonths}
              onChange={(e) => setMinAgeMonths(e.target.value)}
              placeholder="e.g. 36 (3 years)"
              className={inputCls}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="max_age" className={labelCls}>
              Maximum Age (months)
            </label>
            <input
              id="max_age"
              type="number"
              min="0"
              value={maxAgeMonths}
              onChange={(e) => setMaxAgeMonths(e.target.value)}
              placeholder="e.g. 72 (6 years)"
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      {/* ============================================ */}
      {/* Section 4: Pricing                           */}
      {/* ============================================ */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900">
          Pricing & Billing
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Billing type */}
          <div>
            <label htmlFor="billing_type" className={labelCls}>
              Billing Type
            </label>
            <select
  id="billing_type"
  value={billingType}
  onChange={(e) =>
    setBillingType(e.target.value as CreateProgramInput["billing_type"])
  }
  className={inputCls}
  disabled={submitting}
>
              {BILLING_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Session fee */}
          <div>
            <label htmlFor="session_fee" className={labelCls}>
              Session Fee ($)
            </label>
            <input
              id="session_fee"
              type="number"
              min="0"
              step="0.01"
              value={sessionFeeCents}
              onChange={(e) => setSessionFeeCents(e.target.value)}
              placeholder="0.00"
              className={inputCls}
              disabled={submitting}
            />
          </div>

          {/* Casual fee */}
          <div>
            <label htmlFor="casual_fee" className={labelCls}>
              Casual Booking Fee ($)
            </label>
            <input
              id="casual_fee"
              type="number"
              min="0"
              step="0.01"
              value={casualFeeCents}
              onChange={(e) => setCasualFeeCents(e.target.value)}
              placeholder="Same as session fee if blank"
              className={inputCls}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-400">
              Higher rate for one-off casual bookings (optional)
            </p>
          </div>
        </div>
      </fieldset>

      {/* ============================================ */}
      {/* Section 5: Cancellation Policy               */}
      {/* ============================================ */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900">
          Cancellation Policy
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="notice_hours" className={labelCls}>
              Notice Required (hours)
            </label>
            <input
              id="notice_hours"
              type="number"
              min="0"
              value={cancellationNoticeHours}
              onChange={(e) => setCancellationNoticeHours(e.target.value)}
              className={inputCls}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-400">
              Cancellations inside this window are marked as late
            </p>
          </div>
          <div>
            <label htmlFor="late_fee" className={labelCls}>
              Late Cancellation Fee ($)
            </label>
            <input
              id="late_fee"
              type="number"
              min="0"
              step="0.01"
              value={lateCancelFeeCents}
              onChange={(e) => setLateCancelFeeCents(e.target.value)}
              placeholder="0.00"
              className={inputCls}
              disabled={submitting}
            />
          </div>
        </div>
      </fieldset>

      {/* ============================================ */}
      {/* Section 6: CCS (Child Care Subsidy)          */}
      {/* ============================================ */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900">
          Child Care Subsidy (CCS)
        </legend>

        <div className="flex items-center gap-3">
          <input
            id="ccs_eligible"
            type="checkbox"
            checked={ccsEligible}
            onChange={(e) => setCcsEligible(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            disabled={submitting}
          />
          <label htmlFor="ccs_eligible" className="text-sm text-gray-700">
            This program is eligible for Child Care Subsidy
          </label>
        </div>

        {ccsEligible && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ccs_activity" className={labelCls}>
                CCS Activity Type
              </label>
              <input
                id="ccs_activity"
                type="text"
                value={ccsActivityType}
                onChange={(e) => setCcsActivityType(e.target.value)}
                placeholder="e.g. OSHC"
                className={inputCls}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="ccs_service" className={labelCls}>
                CCS Service ID
              </label>
              <input
                id="ccs_service"
                type="text"
                value={ccsServiceId}
                onChange={(e) => setCcsServiceId(e.target.value)}
                placeholder="Service approval number"
                className={inputCls}
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* ============================================ */}
      {/* Actions                                      */}
      {/* ============================================ */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-lg bg-amber-600 px-6 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Program"}
        </button>
      </div>
    </form>
  );
}
