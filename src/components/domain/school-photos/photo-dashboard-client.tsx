"use client";

import { useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  closePhotoSession,
  archivePhotoSession,
} from "@/lib/actions/school-photos";
import type {
  PhotoDashboardData,
  PhotoCoverageStats,
  PhotoSessionWithDetails,
  PhotoSessionStatus,
} from "@/types/domain";

// ============================================================
// Photo Dashboard Client (Module R)
// ============================================================
// Main dashboard component showing coverage stats, quick actions,
// and a session list with management actions (view/close/archive).
// ============================================================

const STATUS_CONFIG: Record<
  PhotoSessionStatus,
  { label: string; tokenBase: string }
> = {
  open: { label: "Open", tokenBase: "photo-session-open" },
  closed: { label: "Closed", tokenBase: "photo-session-closed" },
  archived: { label: "Archived", tokenBase: "photo-session-archived" },
};

function SessionStatusBadge({ status }: { status: PhotoSessionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `var(--${config.tokenBase})`,
        color: `var(--${config.tokenBase}-fg)`,
      }}
    >
      {config.label}
    </span>
  );
}

function PhotoCoverageBar({
  stats,
  label,
}: {
  stats: PhotoCoverageStats;
  label: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {label}
        </span>
        <span
          className="text-sm font-semibold"
          style={{
            color:
              stats.percentage >= 90
                ? "var(--photo-matched)"
                : stats.percentage >= 50
                  ? "var(--photo-unmatched)"
                  : "var(--photo-no-photo)",
          }}
        >
          {stats.percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mb-2 h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${stats.percentage}%`,
            background:
              stats.percentage >= 90
                ? "var(--photo-matched)"
                : stats.percentage >= 50
                  ? "var(--photo-unmatched)"
                  : "var(--photo-no-photo)",
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--muted-foreground)" }}>
          {stats.with_photo} with photo
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          {stats.without_photo} missing
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          {stats.total} total
        </span>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onStatusChange,
}: {
  session: PhotoSessionWithDetails;
  onStatusChange: () => void;
}) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const handleClose = useCallback(() => {
    startTransition(async () => {
      const result = await closePhotoSession(session.id);
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.impact("medium");
      onStatusChange();
    });
  }, [session.id, haptics, onStatusChange]);

  const handleArchive = useCallback(() => {
    startTransition(async () => {
      const result = await archivePhotoSession(session.id);
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.impact("medium");
      onStatusChange();
    });
  }, [session.id, haptics, onStatusChange]);

  const formattedDate = new Date(
    session.session_date + "T00:00:00",
  ).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const createdByName = session.created_by_user
    ? `${session.created_by_user.first_name} ${session.created_by_user.last_name}`
    : null;

  const matchRate =
    session.photos_by_status.total > 0
      ? Math.round(
          (session.photos_by_status.matched / session.photos_by_status.total) *
            100,
        )
      : 0;

  return (
    <div
      className="card-interactive rounded-[var(--radius-lg)] border border-border p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: session info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={`/admin/school-photos/${session.id}`}
              className="truncate text-sm font-semibold hover:underline"
              style={{ color: "var(--foreground)" }}
              onClick={() => haptics.impact("light")}
            >
              {session.name}
            </Link>
            <SessionStatusBadge status={session.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span style={{ color: "var(--muted-foreground)" }}>
              {formattedDate}
            </span>
            <span
              className="capitalize"
              style={{ color: "var(--muted-foreground)" }}
            >
              {session.person_type}
            </span>
            {createdByName && (
              <span style={{ color: "var(--muted-foreground)" }}>
                by {createdByName}
              </span>
            )}
          </div>

          {/* Photo counts */}
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--foreground)" }}>
              {session.photos_by_status.total} photo
              {session.photos_by_status.total !== 1 ? "s" : ""}
            </span>
            {session.photos_by_status.total > 0 && (
              <>
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "var(--photo-matched)" }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--photo-matched)" }}
                  />
                  {session.photos_by_status.matched} matched
                </span>
                {session.photos_by_status.unmatched > 0 && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--photo-unmatched)" }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--photo-unmatched)" }}
                    />
                    {session.photos_by_status.unmatched} unmatched
                  </span>
                )}
                <span
                  className="text-xs"
                  style={{
                    color:
                      matchRate === 100
                        ? "var(--photo-matched)"
                        : "var(--muted-foreground)",
                  }}
                >
                  ({matchRate}%)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Link
            href={`/admin/school-photos/${session.id}`}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium"
            style={{
              background: "var(--background)",
              color: "var(--foreground)",
            }}
            onClick={() => haptics.impact("light")}
          >
            View
          </Link>

          {session.status === "open" && (
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              Close
            </button>
          )}

          {session.status === "closed" && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{
                background: "var(--background)",
                color: "var(--muted-foreground)",
              }}
            >
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PhotoDashboardClientProps {
  dashboard: PhotoDashboardData;
}

export function PhotoDashboardClient({
  dashboard,
}: PhotoDashboardClientProps) {
  const haptics = useHaptics();
  const router = useRouter();

  const handleSessionStatusChange = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Coverage stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PhotoCoverageBar
          stats={dashboard.student_coverage}
          label="Student Photo Coverage"
        />
        <PhotoCoverageBar
          stats={dashboard.staff_coverage}
          label="Staff Photo Coverage"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/admin/school-photos/new"
          className="card-interactive flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
          onClick={() => haptics.impact("light")}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
            style={{
              background:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: "var(--primary)" }}
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
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              New Session
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Create a photo session
            </p>
          </div>
        </Link>

        <Link
          href="/admin/school-photos/upload"
          className="card-interactive flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
          onClick={() => haptics.impact("light")}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
            style={{
              background:
                "color-mix(in srgb, var(--photo-matched) 12%, transparent)",
            }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: "var(--photo-matched)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Upload Photos
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Bulk upload and match
            </p>
          </div>
        </Link>

        <Link
          href="/admin/school-photos/id-cards"
          className="card-interactive flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
          onClick={() => haptics.impact("light")}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
            style={{
              background:
                "color-mix(in srgb, var(--photo-session-open) 12%, transparent)",
            }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: "var(--photo-session-open)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Generate ID Cards
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Batch print student/staff cards
            </p>
          </div>
        </Link>
      </div>

      {/* Sessions list */}
      <div>
        <h2
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Photo Sessions
        </h2>

        {dashboard.sessions.length > 0 ? (
          <div className="space-y-3">
            {dashboard.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onStatusChange={handleSessionStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12"
              style={{ color: "var(--empty-state-icon)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No photo sessions yet.
            </p>
            <Link
              href="/admin/school-photos/new"
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: "var(--primary)" }}
              onClick={() => haptics.impact("light")}
            >
              Create your first session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
