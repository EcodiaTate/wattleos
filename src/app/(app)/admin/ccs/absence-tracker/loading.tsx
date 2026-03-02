// src/app/(app)/admin/ccs/absence-tracker/loading.tsx
import {
  Skeleton,
  SkeletonFilters,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function AbsenceTrackerLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {/* Cap progress bars */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <SkeletonFilters count={3} />
      <SkeletonTable rows={8} />
    </div>
  );
}
