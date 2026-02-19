// src/components/domain/timesheets/pay-period-management-client.tsx
//
// ============================================================
// WattleOS V2 - Pay Period Management Client
// ============================================================
// Interactive list of pay periods with create, lock, and
// status management. Uses inline create form for quick period
// creation based on tenant's configured pay frequency.
//
// WHY 'use client': Period creation and lock are mutations
// requiring form state and optimistic feedback.
// ============================================================

"use client";

import {
  createPayPeriod,
  lockPayPeriod,
  markPayPeriodProcessed,
} from "@/lib/actions/pay-periods";
import { bulkSyncTimesheets } from "@/lib/actions/payroll-integration";
import {
  PAY_FREQUENCY_OPTIONS,
  PAY_PERIOD_STATUS_CONFIG,
} from "@/lib/constants/timesheets";
import type { PayFrequency, PayPeriod } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ============================================================
// Props
// ============================================================

interface PayPeriodManagementClientProps {
  periods: PayPeriod[];
  defaultFrequency: PayFrequency;
  canCreate: boolean;
}

// ============================================================
// Component
// ============================================================

export function PayPeriodManagementClient({
  periods,
  defaultFrequency,
  canCreate,
}: PayPeriodManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createFrequency, setCreateFrequency] =
    useState<PayFrequency>(defaultFrequency);

  // Feedback
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Auto-generate period name ──────────────────────────
  const generateName = (start: string, end: string) => {
    if (!start || !end) return "";
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`;
  };

  // ── Auto-fill end date based on frequency ──────────────
  const handleStartChange = (start: string) => {
    setCreateStart(start);
    if (start) {
      const d = new Date(start + "T00:00:00");
      const days =
        createFrequency === "weekly"
          ? 6
          : createFrequency === "fortnightly"
            ? 13
            : 29;
      d.setDate(d.getDate() + days);
      const end = d.toISOString().split("T")[0];
      setCreateEnd(end);
      setCreateName(generateName(start, end));
    }
  };

  // ── Create period ──────────────────────────────────────
  const handleCreate = async () => {
    if (!createName.trim() || !createStart || !createEnd) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }

    setMessage(null);
    const result = await createPayPeriod({
      name: createName.trim(),
      startDate: createStart,
      endDate: createEnd,
      frequency: createFrequency,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Pay period created." });
      setShowCreate(false);
      setCreateName("");
      setCreateStart("");
      setCreateEnd("");
      startTransition(() => router.refresh());
    }
  };

  // ── Lock period ────────────────────────────────────────
  const handleLock = async (periodId: string) => {
    if (
      !confirm(
        "Lock this period? Staff will no longer be able to add or edit time entries.",
      )
    ) {
      return;
    }
    setMessage(null);
    const result = await lockPayPeriod(periodId);
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Period locked." });
      startTransition(() => router.refresh());
    }
  };

  // ── Sync all approved timesheets ───────────────────────
  const handleSyncAll = async (periodId: string) => {
    setMessage(null);
    const result = await bulkSyncTimesheets(periodId);
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else if (result.data) {
      const { synced, failed } = result.data;
      if (failed > 0) {
        setMessage({
          type: "error",
          text: `Synced ${synced}, failed ${failed}. Check individual timesheets.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `${synced} timesheet(s) synced to payroll.`,
        });
      }
      startTransition(() => router.refresh());
    }
  };

  // ── Mark as processed ──────────────────────────────────
  const handleMarkProcessed = async (periodId: string) => {
    setMessage(null);
    const result = await markPayPeriodProcessed(periodId);
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Period marked as processed." });
      startTransition(() => router.refresh());
    }
  };

  // ── Date formatting ────────────────────────────────────
  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    return `${fmt(s)} – ${fmt(e)}`;
  };

  return (
    <div className="space-y-6">
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

      {/* Create button / form */}
      {canCreate && !showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Pay Period
        </button>
      )}

      {showCreate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Create Pay Period
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Frequency
              </label>
              <select
                value={createFrequency}
                onChange={(e) =>
                  setCreateFrequency(e.target.value as PayFrequency)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PAY_FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Period Name
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Week 7 - 17 Feb to 23 Feb 2026"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={createStart}
                onChange={(e) => handleStartChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={createEnd}
                onChange={(e) => {
                  setCreateEnd(e.target.value);
                  setCreateName(generateName(createStart, e.target.value));
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowCreate(false);
                setCreateName("");
                setCreateStart("");
                setCreateEnd("");
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                isPending || !createName.trim() || !createStart || !createEnd
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Create Period
            </button>
          </div>
        </div>
      )}

      {/* Periods list */}
      {periods.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">
            No pay periods yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first pay period to start accepting timesheets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => {
            const statusConfig = PAY_PERIOD_STATUS_CONFIG[period.status];

            return (
              <div
                key={period.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* Status dot */}
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${statusConfig.dotColor}`}
                  />

                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {period.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateRange(period.start_date, period.end_date)}
                      {" · "}
                      <span className="capitalize">{period.frequency}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>

                  {/* Actions based on status */}
                  {period.status === "open" && (
                    <button
                      onClick={() => handleLock(period.id)}
                      disabled={isPending}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                    >
                      Lock Period
                    </button>
                  )}

                  {period.status === "locked" && canCreate && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSyncAll(period.id)}
                        disabled={isPending}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        Sync All
                      </button>
                      <button
                        onClick={() => handleMarkProcessed(period.id)}
                        disabled={isPending}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        Mark Processed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
