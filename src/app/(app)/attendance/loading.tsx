// src/app/(app)/attendance/loading.tsx

import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function AttendanceLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header with History / Absences links */}
      <div className="flex items-center justify-between">
        <SkeletonHeader />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Class selector + date picker */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <div className="flex flex-wrap gap-3 mb-6">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>

        {/* Student roll rows */}
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3"
            >
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32 flex-1" />
              <div className="flex gap-1.5">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
