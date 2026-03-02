"use client";

// src/components/domain/fee-notice-comms/fee-notice-dashboard-client.tsx

import { useState, useTransition } from "react";
import type { FeeNoticeCommsData, FeeNoticeWithDetails } from "@/types/domain";
import { approveFeeNotices } from "@/lib/actions/fee-notice-comms";
import { FeeNoticeStatusPill } from "./fee-notice-status-pill";
import { FeeNoticeLog } from "./fee-notice-log";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  data: FeeNoticeCommsData;
}

export function FeeNoticeDashboardClient({ data }: Props) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [pendingList, setPendingList] = useState<FeeNoticeWithDetails[]>(
    data.pending_approval,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    haptics.impact("light");
  }

  function selectAll() {
    if (selectedIds.size === pendingList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingList.map((n) => n.id)));
    }
    haptics.impact("light");
  }

  function handleApprove() {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await approveFeeNotices({
        notice_ids: Array.from(selectedIds),
      });

      if (result.data) {
        haptics.success();
        setFeedback(
          `Approved ${result.data.approved} notice(s), dispatching ${result.data.dispatched}.`,
        );
        setPendingList((prev) => prev.filter((n) => !selectedIds.has(n.id)));
        setSelectedIds(new Set());
      } else {
        haptics.error();
        setFeedback(result.error?.message ?? "Failed to approve");
      }

      setTimeout(() => setFeedback(null), 4000);
    });
  }

  const { stats, config } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sent" value={stats.total_sent} cssVar="sent" />
        <StatCard
          label="Pending Approval"
          value={stats.total_pending}
          cssVar="pending"
        />
        <StatCard label="Failed" value={stats.total_failed} cssVar="failed" />
        <StatCard
          label="Overdue (No Notice)"
          value={data.overdue_invoices_without_notice}
          cssVar="failed"
        />
      </div>

      {/* Config Summary */}
      {config && (
        <div
          className="rounded-lg border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Configuration
            </h3>
            <a
              href="/admin/fee-notice-comms/settings"
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              Edit
            </a>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span style={{ color: "var(--muted-foreground)" }}>
              Channels:{" "}
              <strong style={{ color: "var(--foreground)" }}>
                {config.enabled_channels.join(", ")}
              </strong>
            </span>
            <span style={{ color: "var(--muted-foreground)" }}>
              Auto-send:{" "}
              <strong style={{ color: "var(--foreground)" }}>
                {config.auto_send ? "On" : "Off"}
              </strong>
            </span>
            <span style={{ color: "var(--muted-foreground)" }}>
              Reminders:{" "}
              <strong style={{ color: "var(--foreground)" }}>
                {config.reminder_1_days}d / {config.reminder_2_days}d /{" "}
                {config.reminder_3_days}d
              </strong>
            </span>
          </div>
        </div>
      )}

      {!config && (
        <div
          className="rounded-lg border border-border p-4 text-center"
          style={{ background: "var(--card)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Fee notice communications not configured yet.
          </p>
          <a
            href="/admin/fee-notice-comms/settings"
            className="mt-2 inline-block text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            Set up now
          </a>
        </div>
      )}

      {/* Channel Breakdown */}
      {stats.by_channel.some((c) => c.sent + c.delivered + c.failed > 0) && (
        <div>
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Delivery by Channel
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {stats.by_channel.map((ch) => (
              <div
                key={ch.channel}
                className="rounded-lg border border-border p-3"
                style={{ background: "var(--card)" }}
              >
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {ch.channel}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--fee-notice-delivered)" }}
                  >
                    {ch.delivered}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    delivered
                  </span>
                </div>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {ch.sent} sent · {ch.failed} failed
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approval Queue */}
      {pendingList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Pending Approval ({pendingList.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium"
                style={{ color: "var(--primary)" }}
              >
                {selectedIds.size === pendingList.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || isPending}
                onClick={handleApprove}
                className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isPending
                  ? "Approving..."
                  : `Approve & Send (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {feedback && (
            <p
              className="text-xs mb-2"
              style={{ color: "var(--fee-notice-delivered)" }}
            >
              {feedback}
            </p>
          )}

          <div className="space-y-1">
            {pendingList.map((notice) => {
              const studentArr = Array.isArray(notice.student)
                ? notice.student
                : [notice.student];
              const student = studentArr[0];

              return (
                <label
                  key={notice.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-2 cursor-pointer"
                  style={{
                    background: selectedIds.has(notice.id)
                      ? "var(--accent)"
                      : "var(--card)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notice.id)}
                    onChange={() => toggleSelect(notice.id)}
                    className="h-4 w-4 rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {notice.invoice_number} - {student?.first_name}{" "}
                      {student?.last_name}
                    </span>
                    <span
                      className="text-[10px] ml-2"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      ${(notice.amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  <FeeNoticeStatusPill status={notice.status} size="sm" />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent History */}
      <FeeNoticeLog
        notices={data.recent_notices}
        title="Recent Notices"
        emptyMessage="No fee notices have been sent yet."
      />
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  cssVar,
}: {
  label: string;
  value: number;
  cssVar: string;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ background: "var(--card)" }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="text-xl font-bold mt-0.5"
        style={{ color: `var(--fee-notice-${cssVar})` }}
      >
        {value}
      </p>
    </div>
  );
}
