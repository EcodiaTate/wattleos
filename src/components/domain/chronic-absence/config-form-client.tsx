// src/components/domain/chronic-absence/config-form-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateAbsenceMonitoringConfig } from "@/lib/actions/chronic-absence";
import { ROLLING_WINDOW_OPTIONS } from "@/lib/constants/chronic-absence";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceMonitoringConfig } from "@/types/domain";

interface ConfigFormClientProps {
  config: AbsenceMonitoringConfig;
}

export function ConfigFormClient({ config }: ConfigFormClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [atRisk, setAtRisk]         = useState(config.at_risk_threshold);
  const [chronic, setChronic]       = useState(config.chronic_threshold);
  const [severe, setSevere]         = useState(config.severe_threshold);
  const [window, setWindow]         = useState(config.rolling_window_days);
  const [countLate, setCountLate]   = useState(config.count_late_as_absent);
  const [countHalf, setCountHalf]   = useState(config.count_half_day_as_absent);
  const [autoFlag, setAutoFlag]     = useState(config.auto_flag_enabled);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    haptics.medium();
    startTransition(async () => {
      const result = await updateAbsenceMonitoringConfig({
        at_risk_threshold:        atRisk,
        chronic_threshold:        chronic,
        severe_threshold:         severe,
        rolling_window_days:      window,
        count_late_as_absent:     countLate,
        count_half_day_as_absent: countHalf,
        auto_flag_enabled:        autoFlag,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Thresholds */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Attendance thresholds</h3>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Students are classified based on their attendance rate over the rolling window.
          Thresholds must be in order: Severe &lt; Chronic &lt; At Risk.
        </p>

        {[
          {
            label: "At risk threshold",
            description: "Below this % → flagged as At Risk (early intervention)",
            value: atRisk,
            set: setAtRisk,
            cssVar: "at-risk",
          },
          {
            label: "Chronic threshold",
            description: "Below this % → Chronically Absent (formal monitoring)",
            value: chronic,
            set: setChronic,
            cssVar: "chronic",
          },
          {
            label: "Severe threshold",
            description: "Below this % → Severely Absent (welfare referral consideration)",
            value: severe,
            set: setSevere,
            cssVar: "severe",
          },
        ].map((t) => (
          <div key={t.label}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium" style={{ color: `var(--chronic-absence-${t.cssVar})` }}>
                {t.label}
              </label>
              <span className="text-sm font-bold tabular-nums" style={{ color: `var(--chronic-absence-${t.cssVar})` }}>
                {t.value}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={99}
              value={t.value}
              onChange={(e) => t.set(Number(e.target.value))}
              className="w-full accent-[var(--foreground)]"
              style={{ accentColor: `var(--chronic-absence-${t.cssVar})` }}
            />
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{t.description}</p>
          </div>
        ))}
      </section>

      {/* Rolling window */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Rolling window</h3>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          How far back to look when calculating each student's rate.
        </p>
        <select
          value={window}
          onChange={(e) => setWindow(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {ROLLING_WINDOW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* What counts as absent */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Absence calculation</h3>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Choose which attendance statuses contribute to the absence count.
          &quot;Absent&quot; always counts as a full day.
        </p>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={countLate}
            onChange={(e) => setCountLate(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm">Count &quot;Late&quot; as a full absent day</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={countHalf}
            onChange={(e) => setCountHalf(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm">Count &quot;Half Day&quot; as 0.5 absent days</span>
        </label>
      </section>

      {/* Auto-flagging */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Automatic flagging</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoFlag}
            onChange={(e) => setAutoFlag(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <div>
            <span className="text-sm font-medium">Enable auto-flagging</span>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              When enabled, the system creates a monitoring flag when a student&apos;s rate falls
              below the chronic threshold during the nightly check.
            </p>
          </div>
        </label>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {saved && (
        <p className="text-sm" style={{ color: "var(--chronic-absence-good)" }}>
          ✓ Settings saved successfully.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="touch-target active-push rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--foreground)" }}
        >
          {isPending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
