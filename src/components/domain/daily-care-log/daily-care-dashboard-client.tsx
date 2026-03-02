"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  shareDailyCareLog,
  unshareDailyCareLog,
} from "@/lib/actions/daily-care";
import type {
  DailyCareDashboardData,
  DailyCareLogListItem,
} from "@/types/domain";
import { CareLogStatusBadge } from "./care-log-status-badge";
import { ActiveSleeperCard } from "./active-sleeper-card";
import { SunscreenReminderCard } from "./sunscreen-reminder-card";
import { QuickEntryPanel } from "./quick-entry-panel";

// ── Types ──────────────────────────────────────────────────────

interface EligibleChild {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  photo_url: string | null;
}

interface DailyCareLogDashboardClientProps {
  data: DailyCareDashboardData;
  eligibleChildren: EligibleChild[];
  canManage: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function displayName(child: { first_name: string; preferred_name: string | null }): string {
  return child.preferred_name || child.first_name;
}

function ageLabel(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob + "T00:00:00");
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (remainMonths === 0) return `${years}y`;
  return `${years}y ${remainMonths}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Component ──────────────────────────────────────────────────

export function DailyCareLogDashboardClient({
  data,
  eligibleChildren,
  canManage,
}: DailyCareLogDashboardClientProps) {
  const haptics = useHaptics();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tracks which log ID is currently being shared/unshared (for per-row loading)
  const [pendingLogId, setPendingLogId] = useState<string | null>(null);

  const today = useMemo(() => todayDateString(), []);

  const hasAlerts =
    data.active_sleepers.length > 0 || data.sunscreen_reapply_due.length > 0;

  // ── Derived Data ───────────────────────────────────────────

  const selectedChild = useMemo(
    () => eligibleChildren.find((c) => c.id === selectedChildId) ?? null,
    [eligibleChildren, selectedChildId],
  );

  // ── Handlers ───────────────────────────────────────────────

  const handleChildSelect = useCallback(
    (childId: string) => {
      haptics.impact("light");
      setSelectedChildId(childId);
    },
    [haptics],
  );

  const handleEntryAdded = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleShare = useCallback(
    (log: DailyCareLogListItem) => {
      haptics.impact("medium");
      setPendingLogId(log.id);
      startTransition(async () => {
        const result = await shareDailyCareLog({ log_id: log.id });
        setPendingLogId(null);
        if (result.error) {
          haptics.error();
          return;
        }
        haptics.success();
        router.refresh();
      });
    },
    [haptics, router],
  );

  const handleUnshare = useCallback(
    (log: DailyCareLogListItem) => {
      haptics.impact("medium");
      setPendingLogId(log.id);
      startTransition(async () => {
        const result = await unshareDailyCareLog(log.id);
        setPendingLogId(null);
        if (result.error) {
          haptics.error();
          return;
        }
        haptics.success();
        router.refresh();
      });
    },
    [haptics, router],
  );

  const handleSleeperCheck = useCallback(
    (sleeperId: string) => {
      haptics.impact("medium");
      // Navigate to the student's daily care detail page where
      // the sleep check form is accessible
      router.push(`/admin/daily-care-log/${sleeperId}`);
    },
    [haptics, router],
  );

  const handleSunscreenReapply = useCallback(
    (studentId: string) => {
      haptics.impact("medium");
      // Select the child and let them record a new sunscreen entry
      // via the QuickEntryPanel
      setSelectedChildId(studentId);
    },
    [haptics],
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ━━ 1. Alerts Section ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {hasAlerts && (
        <section className="space-y-4">
          {/* Active Sleepers */}
          {data.active_sleepers.length > 0 && (
            <div className="space-y-2">
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                <span role="img" aria-hidden="true">
                  {"\u{1F634}"}
                </span>
                Active Sleepers
                <span
                  className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                  style={{
                    background: "var(--care-sleep)",
                    color: "var(--care-sleep-fg)",
                  }}
                >
                  {data.active_sleepers.length}
                </span>
              </h2>
              <div
                className="scroll-native -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
              >
                {data.active_sleepers.map((sleeper) => (
                  <div
                    key={sleeper.entry.id}
                    className="w-[260px] flex-shrink-0"
                  >
                    <ActiveSleeperCard
                      sleeper={sleeper}
                      onCheck={() =>
                        handleSleeperCheck(sleeper.student.id)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sunscreen Reminders */}
          {data.sunscreen_reapply_due.length > 0 && (
            <div className="space-y-2">
              <h2
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                <span role="img" aria-hidden="true">
                  {"\u{2600}\u{FE0F}"}
                </span>
                Sunscreen Due
                <span
                  className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                  style={{
                    background: "var(--care-sunscreen)",
                    color: "var(--care-sunscreen-fg)",
                  }}
                >
                  {data.sunscreen_reapply_due.length}
                </span>
              </h2>
              <div
                className="scroll-native -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
              >
                {data.sunscreen_reapply_due.map((reminder) => (
                  <div
                    key={reminder.entry.id}
                    className="w-[260px] flex-shrink-0"
                  >
                    <SunscreenReminderCard
                      reminder={reminder}
                      onReapply={() =>
                        handleSunscreenReapply(reminder.student.id)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ━━ 2. Summary Cards ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Children Logged */}
          <SummaryCard
            label="Children Logged"
            value={`${data.summary.total_children_logged} / ${data.summary.total_eligible_children}`}
            accent="var(--primary)"
          />

          {/* Entries Today */}
          <SummaryCard
            label="Entries Today"
            value={String(data.summary.total_entries_today)}
            accent="var(--primary)"
          />

          {/* Shared */}
          <SummaryCard
            label="Shared"
            value={String(data.summary.logs_shared)}
            accent="var(--care-shared)"
          />

          {/* Pending */}
          <SummaryCard
            label="Pending"
            value={String(data.summary.logs_pending)}
            accent="var(--care-in-progress)"
          />
        </div>
      </section>

      {/* ━━ 3. Child Selector + Quick Entry ━━━━━━━━━━━━━━━━━━ */}
      {canManage && (
        <section className="space-y-4">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Quick Entry
          </h2>

          {/* Child Selector */}
          <div className="space-y-2">
            <label
              htmlFor="child-selector"
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Select a child
            </label>
            <select
              id="child-selector"
              value={selectedChildId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                handleChildSelect(value || "");
                if (!value) setSelectedChildId(null);
              }}
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm font-medium"
              style={{
                background: "var(--input)",
                color: "var(--foreground)",
              }}
            >
              <option value="">Choose a child...</option>
              {eligibleChildren.map((child) => {
                const name = displayName(child);
                const age = ageLabel(child.dob);
                return (
                  <option key={child.id} value={child.id}>
                    {name} {child.last_name}
                    {age ? ` (${age})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected child info + QuickEntryPanel */}
          {selectedChild && (
            <div className="space-y-3">
              {/* Selected child header */}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {selectedChild.photo_url ? (
                  <img
                    src={selectedChild.photo_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {displayName(selectedChild).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {displayName(selectedChild)} {selectedChild.last_name}
                  </p>
                  {selectedChild.dob && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {ageLabel(selectedChild.dob)} old
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Entry Panel */}
              <QuickEntryPanel
                studentId={selectedChild.id}
                logDate={today}
                onEntryAdded={handleEntryAdded}
              />
            </div>
          )}
        </section>
      )}

      {/* ━━ 4. Today's Logs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Today&apos;s Logs
        </h2>

        {data.logs_today.length === 0 ? (
          /* ── Empty State ─────────────────────────────────── */
          <div
            className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border py-12"
            style={{ background: "var(--card)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--empty-state-icon)" }}
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              No care entries recorded today
            </p>
            {canManage && (
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Select a child above to start recording
              </p>
            )}
          </div>
        ) : (
          /* ── Log List ────────────────────────────────────── */
          <div className="space-y-2">
            {data.logs_today.map((log) => {
              const childName = displayName(log.student);
              const initial = childName.charAt(0).toUpperCase();
              const isLogPending = pendingLogId === log.id && isPending;

              return (
                <div
                  key={log.id}
                  className="card-interactive rounded-[var(--radius-lg)] border border-border p-4"
                  style={{ background: "var(--card)" }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {log.student.photo_url ? (
                      <img
                        src={log.student.photo_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          background: "var(--primary)",
                          color: "var(--primary-foreground)",
                        }}
                      >
                        {initial}
                      </div>
                    )}

                    {/* Info */}
                    <Link
                      href={`/admin/daily-care-log/${log.student.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {childName} {log.student.last_name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        <span
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {log.entry_count}{" "}
                          {log.entry_count === 1 ? "entry" : "entries"}
                        </span>
                        {log.last_entry_at && (
                          <span
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            Last: {formatTime(log.last_entry_at)}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Status + Action */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <CareLogStatusBadge status={log.status} />

                      {canManage && (
                        <>
                          {log.status === "in_progress" && (
                            <button
                              type="button"
                              onClick={() => handleShare(log)}
                              disabled={isLogPending}
                              className="active-push touch-target rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{
                                background: "var(--care-shared)",
                                color: "var(--care-shared-fg)",
                              }}
                            >
                              {isLogPending ? "Sharing..." : "Share"}
                            </button>
                          )}
                          {log.status === "shared" && (
                            <button
                              type="button"
                              onClick={() => handleUnshare(log)}
                              disabled={isLogPending}
                              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                              style={{
                                background: "var(--card)",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {isLogPending ? "Unsharing..." : "Unshare"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Summary Card Sub-component ─────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4"
      style={{ background: "var(--card)" }}
    >
      <p
        className="text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  );
}
