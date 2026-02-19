// src/app/(app)/parent/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Dashboard
// ============================================================
// Server Component. Shows overview cards for each child linked
// to the current parent. Each card has recent observations,
// mastery snapshot, attendance, and published report count.
//
// WHY server: All data loads are independent per-child, run
// in parallel on the server for instant render.
// ============================================================

import { getChildOverview, getMyChildren } from "@/lib/actions/parent";
import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";

export default async function ParentDashboardPage() {
  const context = await getTenantContext();

  const childrenResult = await getMyChildren();
  const children = childrenResult.data ?? [];

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Children</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, {context.user.first_name ?? context.user.email}
          </p>
        </div>
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No children are linked to your account yet. Please contact the
            school to set up your parent access.
          </p>
        </div>
      </div>
    );
  }

  // Load overviews in parallel
  const overviews = await Promise.all(
    children.map((child) => getChildOverview(child.id)),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Children</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {context.user.first_name ?? context.user.email}. Here&apos;s
          what&apos;s happening with your children.
        </p>
      </div>

      {/* Child cards */}
      <div className="space-y-6">
        {overviews.map((result, index) => {
          const overview = result.data;
          if (!overview) return null;

          return (
            <ChildOverviewCard key={children[index].id} overview={overview} />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ChildOverviewCard
// ============================================================

import type { ChildOverview } from "@/lib/actions/parent";

function ChildOverviewCard({ overview }: { overview: ChildOverview }) {
  const {
    child,
    attendance,
    recentObservations,
    mastery,
    publishedReportCount,
  } = overview;
  const displayName = child.preferredName ?? child.firstName;

  return (
    <div className="overflow-hidden rounded-lg borderborder-border bg-background">
      {/* Child header */}
      <div className="flex items-center gap-[var(--density-card-padding)] border-b border-gray-100 px-6 py-4">
        {child.photoUrl ? (
          <img
            src={child.photoUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
            {child.firstName[0]}
            {child.lastName[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            {displayName} {child.lastName}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {child.className && <span>{child.className}</span>}
            {child.relationship && (
              <>
                <span>&middot;</span>
                <span className="capitalize">{child.relationship}</span>
              </>
            )}
          </div>
        </div>
        <Link
          href={`/parent/${child.id}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-amber-700"
        >
          View Portfolio
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-px bg-muted sm:grid-cols-4">
        {/* Attendance */}
        <div className="bg-background px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Attendance (30d)
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">
              {attendance.attendanceRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {attendance.present} present, {attendance.absent} absent,{" "}
            {attendance.late} late
          </p>
          <Link
            href={`/parent/${child.id}/attendance`}
            className="mt-2 inline-block text-xs font-medium text-primary hover:text-amber-700"
          >
            View details →
          </Link>
        </div>

        {/* Mastery */}
        <div className="bg-background px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Learning Progress
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">
              {mastery.percentMastered}%
            </span>
            <span className="mb-0.5 text-xs text-muted-foreground">
              mastered
            </span>
          </div>
          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
            <span className="text-green-600">{mastery.mastered} mastered</span>
            <span className="text-primary">
              {mastery.practicing} practicing
            </span>
            <span className="text-blue-600">{mastery.presented} presented</span>
          </div>
          <Link
            href={`/parent/${child.id}`}
            className="mt-2 inline-block text-xs font-medium text-primary hover:text-amber-700"
          >
            View progress →
          </Link>
        </div>

        {/* Observations */}
        <div className="bg-background px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent Observations
          </p>
          <div className="mt-2">
            {recentObservations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">None yet</p>
            ) : (
              <div className="space-y-1.5">
                {recentObservations.slice(0, 2).map((obs) => (
                  <div key={obs.id} className="text-xs">
                    <p className="truncate text-foreground">
                      {obs.content?.slice(0, 80) ?? "Observation"}
                      {obs.mediaCount > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          📷{obs.mediaCount}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {obs.authorName} &middot;{" "}
                      {formatRelativeDate(obs.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link
            href={`/parent/${child.id}`}
            className="mt-2 inline-block text-xs font-medium text-primary hover:text-amber-700"
          >
            View all →
          </Link>
        </div>

        {/* Reports */}
        <div className="bg-background px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reports
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">
              {publishedReportCount}
            </span>
            <span className="mb-0.5 text-xs text-muted-foreground">
              published
            </span>
          </div>
          {publishedReportCount > 0 && (
            <Link
              href={`/parent/${child.id}/reports`}
              className="mt-2 inline-block text-xs font-medium text-primary hover:text-amber-700"
            >
              Read reports →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
