"use client";

// src/components/domain/nccd/nccd-dashboard-client.tsx
//
// NCCD register dashboard - summary cards, alerts, and quick links.

import Link from "next/link";

import {
  NCCD_CATEGORIES,
  NCCD_CATEGORY_CONFIG,
  NCCD_LEVELS_ORDERED,
  NCCD_LEVEL_CONFIG,
} from "@/lib/constants/nccd";
import type { NccdDashboardData, NccdEntryWithStudent } from "@/types/domain";

import { NccdAdjustmentLevelBadge } from "./nccd-adjustment-level-badge";

interface NccdDashboardClientProps {
  data: NccdDashboardData;
  canManage: boolean;
}

export function NccdDashboardClient({
  data,
  canManage,
}: NccdDashboardClientProps) {
  const s = data.collection_summary;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(data.entries_requiring_review.length > 0 ||
        data.entries_missing_consent.length > 0 ||
        data.entries_missing_professional_opinion.length > 0) && (
        <div className="space-y-2">
          {data.entries_requiring_review.length > 0 && (
            <Alert
              type="warning"
              message={`${data.entries_requiring_review.length} entr${data.entries_requiring_review.length === 1 ? "y" : "ies"} flagged for review`}
              href="/admin/nccd/register?status=under_review"
            />
          )}
          {data.entries_missing_consent.length > 0 && (
            <Alert
              type="warning"
              message={`${data.entries_missing_consent.length} active entr${data.entries_missing_consent.length === 1 ? "y" : "ies"} missing parental consent`}
              href="/admin/nccd/register"
            />
          )}
          {data.entries_missing_professional_opinion.length > 0 && (
            <Alert
              type="info"
              message={`${data.entries_missing_professional_opinion.length} entr${data.entries_missing_professional_opinion.length === 1 ? "y" : "ies"} without a professional opinion on record`}
              href="/admin/nccd/register"
            />
          )}
        </div>
      )}

      {/* Collection summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {s.year} Collection Summary
          </h2>
          <Link
            href="/admin/nccd/export"
            className="touch-target active-push rounded-xl border border-border px-3 py-1.5 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Export CSV →
          </Link>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total students" value={s.total_students} icon="♿" />
          <StatCard
            label="Submitted"
            value={s.submitted}
            icon="✓"
            color="var(--nccd-status-active)"
          />
          <StatCard
            label="Pending"
            value={s.pending_submission}
            icon="⏳"
            color="var(--nccd-supplementary)"
          />
          {data.prior_year_summary && (
            <StatCard
              label={`${data.prior_year_summary.year} total`}
              value={data.prior_year_summary.total_students}
              icon="📅"
            />
          )}
        </div>
      </section>

      {/* By adjustment level */}
      <section className="space-y-3">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          By Adjustment Level
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NCCD_LEVELS_ORDERED.map((lvl) => {
            const count = s.by_level[lvl] ?? 0;
            const pct =
              s.total_students > 0
                ? Math.round((count / s.total_students) * 100)
                : 0;
            const config = NCCD_LEVEL_CONFIG[lvl];
            return (
              <Link
                key={lvl}
                href={`/admin/nccd/register?level=${lvl}`}
                className="card-interactive rounded-xl border border-border p-4 space-y-2 block"
                style={{ background: "var(--card)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {config.shortLabel}
                  </span>
                  <NccdAdjustmentLevelBadge level={lvl} size="sm" />
                </div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: config.cssVar }}
                >
                  {count}
                </p>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--muted)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: config.cssVar }}
                  />
                </div>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {pct}% of {s.year} cohort
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* By category */}
      <section className="space-y-3">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          By Disability Category
        </h2>
        <div
          className="rounded-xl border border-border overflow-hidden"
          style={{ background: "var(--card)" }}
        >
          {NCCD_CATEGORIES.map((cat, i) => {
            const count = s.by_category[cat] ?? 0;
            const pct =
              s.total_students > 0
                ? Math.round((count / s.total_students) * 100)
                : 0;
            const config = NCCD_CATEGORY_CONFIG[cat];
            return (
              <div
                key={cat}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < NCCD_CATEGORIES.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-lg w-6 text-center shrink-0">
                  {config.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {config.label}
                  </p>
                  <div
                    className="mt-1 h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: config.cssVar }}
                    />
                  </div>
                </div>
                <span
                  className="shrink-0 text-sm font-semibold w-8 text-right"
                  style={{ color: config.cssVar }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent entries */}
      {data.recent_entries.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Recent Entries
            </h2>
            <Link
              href="/admin/nccd/register"
              className="text-sm"
              style={{ color: "var(--primary)" }}
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {data.recent_entries.map((entry) => (
              <RecentEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {s.total_students === 0 && (
        <div className="py-16 text-center space-y-3">
          <p className="text-4xl" style={{ color: "var(--empty-state-icon)" }}>
            ♿
          </p>
          <p
            className="font-semibold text-lg"
            style={{ color: "var(--foreground)" }}
          >
            No NCCD entries for {s.year}
          </p>
          <p
            className="text-sm max-w-sm mx-auto"
            style={{ color: "var(--muted-foreground)" }}
          >
            The NCCD register records students with disability and the
            adjustments made to support their learning.
          </p>
          {canManage && (
            <Link
              href="/admin/nccd/register/new"
              className="touch-target active-push mt-2 inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Add First Entry
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl border border-border p-4 space-y-1"
      style={{ background: "var(--card)" }}
    >
      <p className="text-2xl">{icon}</p>
      <p
        className="text-2xl font-bold leading-tight"
        style={{ color: color ?? "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
    </div>
  );
}

function Alert({
  type,
  message,
  href,
}: {
  type: "warning" | "info";
  message: string;
  href: string;
}) {
  const isWarning = type === "warning";
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
      style={{
        background: isWarning
          ? "var(--nccd-status-under-review-bg)"
          : "var(--nccd-qdtp-bg)",
        color: isWarning
          ? "var(--nccd-status-under-review-fg)"
          : "var(--nccd-qdtp-fg)",
        borderColor: isWarning
          ? "var(--nccd-status-under-review)"
          : "var(--nccd-qdtp)",
      }}
    >
      <span>{isWarning ? "⚠️" : "ℹ️"}</span>
      <span className="flex-1">{message}</span>
      <span>→</span>
    </Link>
  );
}

function RecentEntryRow({ entry }: { entry: NccdEntryWithStudent }) {
  const name = entry.student.preferred_name
    ? `${entry.student.preferred_name} ${entry.student.last_name}`
    : `${entry.student.first_name} ${entry.student.last_name}`;
  return (
    <Link
      href={`/admin/nccd/register/${entry.student_id}`}
      className="card-interactive flex items-center gap-3 rounded-xl border border-border px-4 py-3"
      style={{ background: "var(--card)" }}
    >
      <span className="text-xl">
        {NCCD_CATEGORY_CONFIG[entry.disability_category].emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: "var(--foreground)" }}
        >
          {name}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {NCCD_CATEGORY_CONFIG[entry.disability_category].label}
        </p>
      </div>
      <NccdAdjustmentLevelBadge level={entry.adjustment_level} size="sm" />
    </Link>
  );
}
