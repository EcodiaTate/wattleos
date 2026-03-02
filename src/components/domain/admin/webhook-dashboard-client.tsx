"use client";

// src/components/domain/admin/webhook-dashboard-client.tsx
//
// ============================================================
// WattleOS V2 - Webhook Health Dashboard (Client Component)
// ============================================================
// • Summary stat cards (pending, succeeded, dead-letter, success rate)
// • 7-day success-rate mini-chart
// • Filterable event table (provider, status)
// • Dead-letter queue section with manual Retry button
// ============================================================

import { listWebhookEvents, retryWebhookEvent } from "@/lib/actions/webhooks";
import type {
  WebhookDashboardStats,
  WebhookEvent,
  WebhookProvider,
  WebhookEventStatus,
} from "@/types/domain";
import { useState, useTransition } from "react";

// ============================================================
// Props
// ============================================================

interface WebhookDashboardClientProps {
  stats: WebhookDashboardStats | null;
  initialEvents: WebhookEvent[];
  initialTotal: number;
}

// ============================================================
// Helpers
// ============================================================

const PROVIDER_LABELS: Record<WebhookProvider, string> = {
  stripe: "Stripe",
  sms: "SMS",
  google_drive: "Google Drive",
  keypay: "KeyPay",
};

const STATUS_STYLES: Record<WebhookEventStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  succeeded:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed_permanent:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABELS: Record<WebhookEventStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  failed_permanent: "Dead Letter",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ============================================================
// Stat card
// ============================================================

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "red" | "green" | "yellow";
}) {
  const accentClass =
    accent === "red"
      ? "border-l-4 border-red-500"
      : accent === "green"
        ? "border-l-4 border-green-500"
        : accent === "yellow"
          ? "border-l-4 border-yellow-500"
          : "";

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${accentClass}`}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ============================================================
// Mini bar chart (7-day success rate)
// ============================================================

function SuccessRateChart({
  days,
}: {
  days: WebhookDashboardStats["dailyBreakdown"];
}) {
  if (days.length === 0) return null;

  const max = Math.max(...days.map((d) => d.total), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground mb-3">
        Events (7 days)
      </p>
      <div className="flex items-end gap-1 h-16">
        {days.map((day) => {
          const successH = (day.succeeded / max) * 64;
          const failH = (day.failed / max) * 64;
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col-reverse gap-0.5"
              title={`${day.date}: ${day.succeeded} ok, ${day.failed} failed`}
            >
              {failH > 0 && (
                <div
                  className="w-full rounded-sm bg-red-400"
                  style={{ height: `${failH}px` }}
                />
              )}
              {successH > 0 && (
                <div
                  className="w-full rounded-sm bg-green-400"
                  style={{ height: `${successH}px` }}
                />
              )}
              {day.total === 0 && (
                <div className="w-full h-1 rounded-sm bg-muted" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-sm bg-green-400" />
          Succeeded
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-sm bg-red-400" />
          Failed
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function WebhookDashboardClient({
  stats,
  initialEvents,
  initialTotal,
}: WebhookDashboardClientProps) {
  const [events, setEvents] = useState<WebhookEvent[]>(initialEvents);
  const [total, setTotal] = useState(initialTotal);
  const [filterProvider, setFilterProvider] = useState<WebhookProvider | "">(
    "",
  );
  const [filterStatus, setFilterStatus] = useState<WebhookEventStatus | "">("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<Record<string, string>>(
    {},
  );
  const [isPending, startTransition] = useTransition();

  function applyFilter(
    provider: WebhookProvider | "",
    status: WebhookEventStatus | "",
  ) {
    setFilterProvider(provider);
    setFilterStatus(status);
    startTransition(async () => {
      const result = await listWebhookEvents({
        provider: provider || undefined,
        status: status || undefined,
        limit: 50,
      });
      if (result.data) {
        setEvents(result.data.events);
        setTotal(result.data.total);
      }
    });
  }

  async function handleRetry(eventId: string) {
    setRetryingId(eventId);
    const result = await retryWebhookEvent(eventId);
    setRetryingId(null);
    if (result.data?.success) {
      setRetryFeedback((prev) => ({
        ...prev,
        [eventId]: "Retried - check status",
      }));
      // Refresh list
      startTransition(async () => {
        const refreshed = await listWebhookEvents({
          provider: filterProvider || undefined,
          status: filterStatus || undefined,
          limit: 50,
        });
        if (refreshed.data) {
          setEvents(refreshed.data.events);
          setTotal(refreshed.data.total);
        }
      });
    } else {
      setRetryFeedback((prev) => ({
        ...prev,
        [eventId]: result.error?.message ?? "Retry failed",
      }));
    }
  }

  const deadLetterEvents = events.filter(
    (e) => e.status === "failed_permanent",
  );

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Pending / Retrying"
            value={stats.pending}
            accent={stats.pending > 0 ? "yellow" : undefined}
          />
          <StatCard
            label="Succeeded (7d)"
            value={stats.succeeded}
            accent="green"
          />
          <StatCard
            label="Dead Letter"
            value={stats.deadLetterCount}
            sub="Manual retry required"
            accent={stats.deadLetterCount > 0 ? "red" : undefined}
          />
          <StatCard
            label="Success Rate (7d)"
            value={`${stats.successRate7d}%`}
            accent={stats.successRate7d < 95 ? "yellow" : "green"}
          />
        </div>
      )}

      {/* ── Chart ── */}
      {stats && stats.dailyBreakdown.length > 0 && (
        <SuccessRateChart days={stats.dailyBreakdown} />
      )}

      {/* ── Dead-letter queue ── */}
      {deadLetterEvents.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
            Dead-Letter Queue - {deadLetterEvents.length} event
            {deadLetterEvents.length !== 1 ? "s" : ""} require manual retry
          </p>
          <div className="space-y-2">
            {deadLetterEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-md border border-red-200 dark:border-red-900/50 bg-white dark:bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {PROVIDER_LABELS[event.provider]} - {event.event_type}
                  </p>
                  {event.error_message && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-sm">
                      {event.error_message}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.retry_count} attempt
                    {event.retry_count !== 1 ? "s" : ""} ·{" "}
                    {formatRelative(event.created_at)}
                  </p>
                  {retryFeedback[event.id] && (
                    <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                      {retryFeedback[event.id]}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRetry(event.id)}
                  disabled={retryingId === event.id}
                  className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {retryingId === event.id ? "Retrying…" : "Retry"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Event log ── */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">
            Recent Events{" "}
            {total > 0 && (
              <span className="text-muted-foreground">({total})</span>
            )}
          </p>
          <div className="flex gap-2">
            <select
              value={filterProvider}
              onChange={(e) =>
                applyFilter(
                  e.target.value as WebhookProvider | "",
                  filterStatus,
                )
              }
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All providers</option>
              <option value="stripe">Stripe</option>
              <option value="sms">SMS</option>
              <option value="google_drive">Google Drive</option>
              <option value="keypay">KeyPay</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) =>
                applyFilter(
                  filterProvider,
                  e.target.value as WebhookEventStatus | "",
                )
              }
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed_permanent">Dead Letter</option>
            </select>
          </div>
        </div>

        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No events found
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3">
                <div className="mt-0.5 shrink-0">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status]}`}
                  >
                    {STATUS_LABELS[event.status]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">
                      {PROVIDER_LABELS[event.provider]}
                    </span>
                    {" - "}
                    <span className="font-mono text-xs">
                      {event.event_type}
                    </span>
                  </p>
                  {event.error_message && (
                    <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 truncate max-w-lg">
                      {event.error_message}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelative(event.created_at)}
                    {event.retry_count > 0 &&
                      ` · ${event.retry_count} retry attempt${event.retry_count !== 1 ? "s" : ""}`}
                    {event.processed_at &&
                      ` · processed ${formatRelative(event.processed_at)}`}
                  </p>
                </div>
                {event.status === "failed_permanent" && (
                  <button
                    onClick={() => handleRetry(event.id)}
                    disabled={retryingId === event.id}
                    className="shrink-0 self-start rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {retryingId === event.id ? "…" : "Retry"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
