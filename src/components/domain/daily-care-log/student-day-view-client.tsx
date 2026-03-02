"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  shareDailyCareLog,
  deleteCareEntry,
} from "@/lib/actions/daily-care";
import type { DailyCareLogWithEntries } from "@/types/domain";
import { CareTimeline } from "./care-timeline";
import { QuickEntryPanel } from "./quick-entry-panel";
import { CareLogStatusBadge } from "./care-log-status-badge";

// ── Types ──────────────────────────────────────────────────────

interface StudentDayViewClientProps {
  log: DailyCareLogWithEntries | null;
  studentId: string;
  studentName: string;
  logDate: string;
  canManage: boolean;
}

// ── Component ──────────────────────────────────────────────────

export function StudentDayViewClient({
  log,
  studentId,
  studentName,
  logDate,
  canManage,
}: StudentDayViewClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shareError, setShareError] = useState<string | null>(null);

  const handleEntryAdded = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      haptics.impact("medium");
      startTransition(async () => {
        const result = await deleteCareEntry(entryId);
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

  const handleShare = useCallback(() => {
    if (!log) return;
    haptics.impact("heavy");
    setShareError(null);
    startTransition(async () => {
      const result = await shareDailyCareLog({ log_id: log.id });
      if (result.error) {
        haptics.error();
        setShareError(result.error.message);
        return;
      }
      haptics.success();
      router.refresh();
    });
  }, [haptics, log, router]);

  const formattedDate = new Date(logDate + "T00:00:00").toLocaleDateString(
    "en-AU",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const hasEntries = log !== null && log.entries.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/daily-care-log"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Daily Care Log
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>{studentName}</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {studentName}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {log && <CareLogStatusBadge status={log.status} />}

            {/* Share with family button */}
            {canManage && log && log.status === "in_progress" && hasEntries && (
              <button
                type="button"
                onClick={handleShare}
                disabled={isPending}
                className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{
                  background: "var(--care-shared)",
                  color: "var(--care-shared-fg)",
                }}
              >
                {isPending ? "Sharing..." : "Share with Family"}
              </button>
            )}
          </div>
        </div>

        {shareError && (
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--destructive)" }}
          >
            {shareError}
          </p>
        )}
      </div>

      {/* ── Quick Entry Panel ────────────────────────────────────── */}
      {canManage && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Record Entry
          </h2>
          <QuickEntryPanel
            studentId={studentId}
            logDate={logDate}
            onEntryAdded={handleEntryAdded}
          />
        </div>
      )}

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Today&apos;s Timeline
        </h2>
        <CareTimeline
          entries={log?.entries ?? []}
          onDelete={canManage ? handleDeleteEntry : undefined}
          readOnly={!canManage}
        />
      </div>

      {/* ── Navigation Links ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/daily-care-log/${studentId}/history`}
          className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={12} cy={12} r={10} />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          View History
        </Link>

        <Link
          href="/admin/daily-care-log"
          className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: "var(--card)",
            color: "var(--muted-foreground)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
