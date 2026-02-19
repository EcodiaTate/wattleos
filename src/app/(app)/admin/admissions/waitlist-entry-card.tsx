// src/app/(app)/admin/admissions/waitlist-entry-card.tsx
//
// ============================================================
// WattleOS V2 - Waitlist Entry Card (Module 13)
// ============================================================
// Compact card for the kanban board. Shows the essential info
// an admin needs at a glance: child name, parent name, program,
// how long they've been waiting, and priority level.
//
// WHY not a server component: Cards live inside the PipelineKanban
// client component (needed for filtering + optimistic updates).
// The card itself has no data fetching - it's purely presentational
// with a callback for the "Move" action.
//
// Clicking the card body links to /admin/admissions/[id] for
// the full detail view (Batch 2). The Move button opens the
// stage transition modal.
// ============================================================

"use client";

import type { WaitlistEntry } from "@/lib/actions/admissions/waitlist-pipeline";
import Link from "next/link";

interface WaitlistEntryCardProps {
  entry: WaitlistEntry;
  canManage: boolean;
  onMoveClick: () => void;
}

// ── Priority badge ───────────────────────────────────────────
function PriorityBadge({ priority }: { priority: number }) {
  if (priority === 0) return null;

  const isHigh = priority >= 5;
  const colorClasses = isHigh
    ? "bg-red-50 text-red-700 ring-red-600/20"
    : "bg-amber-50 text-amber-700 ring-amber-600/20";

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${colorClasses}`}
      title={`Priority: ${priority}`}
    >
      P{priority}
    </span>
  );
}

// ── Days waiting calculation ─────────────────────────────────
function getDaysWaiting(inquiryDate: string): number {
  const inquiry = new Date(inquiryDate);
  const now = new Date();
  return Math.floor(
    (now.getTime() - inquiry.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function DaysWaitingBadge({ days }: { days: number }) {
  let colorClasses = "text-gray-500";
  if (days > 180) colorClasses = "text-red-600 font-semibold";
  else if (days > 90) colorClasses = "text-amber-600";

  return (
    <span className={`text-[11px] ${colorClasses}`} title="Days in pipeline">
      {days}d
    </span>
  );
}

// ── Offer expiry warning ─────────────────────────────────────
function OfferExpiryWarning({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) {
    return (
      <span className="text-[10px] font-semibold text-red-600">
        Offer expired
      </span>
    );
  }

  if (daysLeft <= 3) {
    return (
      <span className="text-[10px] font-semibold text-amber-600">
        Expires in {daysLeft}d
      </span>
    );
  }

  return null;
}

// ── Main Card ────────────────────────────────────────────────

export function WaitlistEntryCard({
  entry,
  canManage,
  onMoveClick,
}: WaitlistEntryCardProps) {
  const daysWaiting = getDaysWaiting(entry.inquiry_date);
  const childName = `${entry.child_first_name} ${entry.child_last_name}`;
  const parentName = `${entry.parent_first_name} ${entry.parent_last_name}`;

  return (
    <div className="group rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Card body - links to detail page */}
      <Link
        href={`/admin/admissions/${entry.id}`}
        className="block px-3 py-2.5"
      >
        {/* Top row: child name + priority + days */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {childName}
            </p>
            <p className="truncate text-xs text-gray-500">{parentName}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <PriorityBadge priority={entry.priority} />
            <DaysWaitingBadge days={daysWaiting} />
          </div>
        </div>

        {/* Program + DOB */}
        <div className="mt-1.5 flex items-center gap-2">
          {entry.requested_program && (
            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {entry.requested_program}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            DOB:{" "}
            {new Date(entry.child_date_of_birth).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Offer expiry warning (only for offered stage) */}
        {entry.stage === "offered" && (
          <div className="mt-1">
            <OfferExpiryWarning expiresAt={entry.offer_expires_at} />
          </div>
        )}

        {/* Tour date (for tour_scheduled) */}
        {entry.stage === "tour_scheduled" && entry.tour_date && (
          <div className="mt-1">
            <span className="text-[10px] text-teal-600">
              Tour:{" "}
              {new Date(entry.tour_date).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Siblings flag */}
        {entry.siblings_at_school && (
          <div className="mt-1">
            <span className="text-[10px] text-purple-600">
              🏫 Sibling at school
            </span>
          </div>
        )}
      </Link>

      {/* Action bar - only visible on hover or when canManage */}
      {canManage && (
        <div className="flex border-t border-gray-100 px-2 py-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveClick();
            }}
            className="flex-1 rounded px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            Move →
          </button>
          <Link
            href={`mailto:${entry.parent_email}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            Email
          </Link>
        </div>
      )}
    </div>
  );
}
