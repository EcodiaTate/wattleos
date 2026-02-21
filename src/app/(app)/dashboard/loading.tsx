// src/app/(app)/dashboard/loading.tsx
//
// ============================================================
// WattleOS V2 - Dashboard Loading Skeleton
// ============================================================
// Matches the shape of the real dashboard: welcome header,
// quick actions, KPI cards, and detail sections.
// ============================================================

import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-[var(--density-section-gap)]">
      {/* Welcome header */}
      <SkeletonHeader />

      {/* Quick action cards */}
      <SkeletonCardGrid count={3} columns="sm:grid-cols-2 lg:grid-cols-3" />

      {/* Today at a Glance — KPI row */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid gap-[var(--density-md)] sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Detail cards grid */}
      <div className="grid gap-[var(--density-section-gap)] lg:grid-cols-2">
        {/* Attendance detail skeleton */}
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border/50 bg-muted/30 p-2 text-center space-y-1"
              >
                <Skeleton className="h-5 w-6 mx-auto" />
                <Skeleton className="h-2 w-10 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Observation detail skeleton */}
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Mastery detail skeleton */}
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-2 w-6" />
              </div>
            ))}
          </div>
        </div>

        {/* Billing / Admissions skeleton */}
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}