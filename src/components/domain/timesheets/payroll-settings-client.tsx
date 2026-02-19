// src/components/domain/timesheets/payroll-settings-client.tsx
//
// ============================================================
// WattleOS V2 - Payroll Settings Form Client
// ============================================================
// Interactive form for configuring payroll:
//   • Pay frequency + cycle start day
//   • Default work hours (pre-filled in timesheet grid)
//   • Payroll provider selection (Xero/KeyPay/None)
//   • Auto-create periods toggle
//
// WHY 'use client': Form state management + server action
// mutation for saving settings.
// ============================================================

"use client";

import { updatePayrollSettings } from "@/lib/actions/payroll-integration";
import { PAY_FREQUENCY_OPTIONS } from "@/lib/constants/timesheets";
import type {
  PayFrequency,
  PayrollProvider,
  PayrollSettings,
} from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ============================================================
// Props
// ============================================================

interface PayrollSettingsClientProps {
  settings: PayrollSettings;
}

// ============================================================
// Day options
// ============================================================

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

// ============================================================
// Component
// ============================================================

export function PayrollSettingsClient({
  settings,
}: PayrollSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state - initialised from current settings
  const [payFrequency, setPayFrequency] = useState<PayFrequency>(
    settings.pay_frequency,
  );
  const [payCycleStartDay, setPayCycleStartDay] = useState(
    settings.pay_cycle_start_day,
  );
  const [defaultStartTime, setDefaultStartTime] = useState(
    settings.default_start_time,
  );
  const [defaultEndTime, setDefaultEndTime] = useState(
    settings.default_end_time,
  );
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState(
    settings.default_break_minutes,
  );
  const [payrollProvider, setPayrollProvider] = useState<PayrollProvider | "">(
    settings.payroll_provider ?? "",
  );
  const [autoCreatePeriods, setAutoCreatePeriods] = useState(
    settings.auto_create_periods,
  );

  // Feedback
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = () => setIsDirty(true);

  // ── Save settings ──────────────────────────────────────
  const handleSave = async () => {
    setMessage(null);

    const result = await updatePayrollSettings({
      payFrequency,
      payCycleStartDay,
      defaultStartTime,
      defaultEndTime,
      defaultBreakMinutes,
      payrollProvider:
        payrollProvider === "" ? null : (payrollProvider as PayrollProvider),
      autoCreatePeriods,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Payroll settings saved." });
      setIsDirty(false);
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Pay Cycle Section */}
      <section className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-base font-semibold text-foreground">Pay Cycle</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How often staff get paid and when the cycle starts.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Pay Frequency
            </label>
            <select
              value={payFrequency}
              onChange={(e) => {
                setPayFrequency(e.target.value as PayFrequency);
                markDirty();
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAY_FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Cycle Start Day
            </label>
            <select
              value={payCycleStartDay}
              onChange={(e) => {
                setPayCycleStartDay(parseInt(e.target.value, 10));
                markDirty();
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <input
            id="auto-create"
            type="checkbox"
            checked={autoCreatePeriods}
            onChange={(e) => {
              setAutoCreatePeriods(e.target.checked);
              markDirty();
            }}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <label htmlFor="auto-create" className="text-sm text-foreground">
            Automatically create the next pay period when the current one is
            locked
          </label>
        </div>
      </section>

      {/* Default Work Hours Section */}
      <section className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-base font-semibold text-foreground">
          Default Work Hours
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-filled in the timesheet grid. Staff can override per day.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Start Time
            </label>
            <input
              type="time"
              value={defaultStartTime}
              onChange={(e) => {
                setDefaultStartTime(e.target.value);
                markDirty();
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              End Time
            </label>
            <input
              type="time"
              value={defaultEndTime}
              onChange={(e) => {
                setDefaultEndTime(e.target.value);
                markDirty();
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Break (minutes)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={defaultBreakMinutes}
              onChange={(e) => {
                setDefaultBreakMinutes(parseInt(e.target.value, 10) || 0);
                markDirty();
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Calculated daily hours preview */}
        {defaultStartTime && defaultEndTime && (
          <p className="mt-3 text-xs text-muted-foreground">
            {(() => {
              const [sh, sm] = defaultStartTime.split(":").map(Number);
              const [eh, em] = defaultEndTime.split(":").map(Number);
              const totalMinutes =
                eh * 60 + em - (sh * 60 + sm) - defaultBreakMinutes;
              const hours = (totalMinutes / 60).toFixed(1);
              return `= ${hours} hours per day (excluding ${defaultBreakMinutes}min break)`;
            })()}
          </p>
        )}
      </section>

      {/* Payroll Provider Section */}
      <section className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-base font-semibold text-foreground">
          Payroll Provider
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect to an external payroll system to automatically push approved
          timesheets. WattleOS handles time logging and approval - your payroll
          system handles tax, super, and leave calculations.
        </p>

        <div className="mt-5">
          <label className="block text-sm font-medium text-foreground">
            Provider
          </label>
          <select
            value={payrollProvider}
            onChange={(e) => {
              setPayrollProvider(e.target.value as PayrollProvider | "");
              markDirty();
            }}
            className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">None (manual export)</option>
            <option value="xero">Xero</option>
            <option value="keypay">KeyPay</option>
          </select>
        </div>

        {payrollProvider && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>
              {payrollProvider === "xero" ? "Xero" : "KeyPay"} integration
            </strong>{" "}
            will be available in a future update. For now, you can approve
            timesheets and export hours manually. The approved totals are ready
            for manual entry into{" "}
            {payrollProvider === "xero" ? "Xero" : "KeyPay"}.
          </div>
        )}
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
