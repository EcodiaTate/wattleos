// src/app/(app)/timesheets/loading.tsx

import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function TimesheetsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />

      {/* Timesheet grid skeleton */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-4 w-24 shrink-0" />
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 flex-1 rounded-md" />
                ))}
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
