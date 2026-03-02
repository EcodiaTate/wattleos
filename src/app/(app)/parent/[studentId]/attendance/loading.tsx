// src/app/(app)/parent/[studentId]/attendance/loading.tsx
import {
  Skeleton,
  SkeletonFilters,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ChildAttendanceLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-3 space-y-2"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <SkeletonFilters count={3} />
      <SkeletonTable rows={8} />
    </div>
  );
}
