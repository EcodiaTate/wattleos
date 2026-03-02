// src/components/domain/absence-followup/absence-followup-dashboard-client.tsx

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCard } from "./alert-card";
import { AlertStatusBadge } from "./alert-status-badge";
import { generateDailyAlerts } from "@/lib/actions/absence-followup";
import { ALERT_STATUS_CONFIG } from "@/lib/constants/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceAlertStatus, AbsenceFollowupDashboardData } from "@/types/domain";

interface AbsenceFollowupDashboardClientProps {
  data: AbsenceFollowupDashboardData;
  canManage: boolean;
}

const STATUS_FILTERS: Array<{ value: AbsenceAlertStatus | "all"; label: string }> = [
  { value: "all",       label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "notified",  label: "Notified" },
  { value: "escalated", label: "Escalated" },
  { value: "explained", label: "Explained" },
  { value: "dismissed", label: "Dismissed" },
];

export function AbsenceFollowupDashboardClient({
  data,
  canManage,
}: AbsenceFollowupDashboardClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<AbsenceAlertStatus | "all">("all");
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  const { config, summary, alerts, date } = data;

  const filtered =
    statusFilter === "all"
      ? alerts
      : alerts.filter((a) => a.status === statusFilter);

  const summaryItems: Array<{
    key: AbsenceAlertStatus;
    count: number;
  }> = [
    { key: "pending",   count: summary.pending },
    { key: "escalated", count: summary.escalated },
    { key: "notified",  count: summary.notified },
    { key: "explained", count: summary.explained },
    { key: "dismissed", count: summary.dismissed },
  ];

  function handleGenerate() {
    haptics.medium();
    setGenerateResult(null);
    startTransition(async () => {
      const result = await generateDailyAlerts({ date });
      if (result.data) {
        const { generated } = result.data;
        setGenerateResult(
          generated === 0
            ? "No new unexplained absences found."
            : `${generated} new alert${generated !== 1 ? "s" : ""} generated.`,
        );
        haptics.success();
        router.refresh();
      } else {
        setGenerateResult(result.error?.message ?? "Failed to generate alerts.");
        haptics.error();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Config banner if disabled */}
      {!config.enabled && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            background: "var(--absence-followup-dismissed-bg)",
            borderColor: "var(--absence-followup-dismissed)",
            color: "var(--absence-followup-dismissed-fg)",
          }}
        >
          Absence follow-up is currently disabled. Enable it in{" "}
          <a href="/attendance/absence-followup/config" className="underline font-medium">
            Settings
          </a>.
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {summaryItems.map(({ key, count }) => {
          const cfg = ALERT_STATUS_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => {
                haptics.selection();
                setStatusFilter(statusFilter === key ? "all" : key);
              }}
              className="rounded-xl border p-3 text-left transition-colors space-y-1 active-push touch-target"
              style={{
                background: statusFilter === key
                  ? `var(--absence-followup-${cfg.cssVar}-bg)`
                  : "var(--card)",
                borderColor: statusFilter === key
                  ? `var(--absence-followup-${cfg.cssVar})`
                  : "var(--border)",
              }}
            >
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: `var(--absence-followup-${cfg.cssVar})` }}
              >
                {count}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                {cfg.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Generate alerts control */}
      {canManage && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={isPending || !config.enabled}
            className="touch-target active-push rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Generating…" : "Generate Alerts for Today"}
          </button>
          {generateResult && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {generateResult}
            </p>
          )}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              haptics.selection();
              setStatusFilter(f.value as AbsenceAlertStatus | "all");
            }}
            className="touch-target active-push rounded-full px-3 py-1.5 text-xs font-medium border transition-colors"
            style={{
              background: statusFilter === f.value ? "var(--foreground)" : "var(--background)",
              color: statusFilter === f.value ? "var(--background)" : "var(--foreground)",
              borderColor: "var(--border)",
            }}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-60">
                ({summary[f.value as AbsenceAlertStatus] ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="text-4xl" style={{ color: "var(--empty-state-icon)" }}>📞</div>
          <p className="text-sm font-medium">
            {summary.total_today === 0
              ? "No unexplained absences today"
              : "No alerts match the current filter"}
          </p>
          {summary.total_today === 0 && canManage && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              After roll call, click "Generate Alerts" to scan for unexplained absences.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              canManage={canManage}
              onUpdate={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
