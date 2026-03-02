// src/app/(app)/admin/rostering/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function RosteringLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />
      {/* Week roster skeleton */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <SkeletonTable rows={6} />
      </div>
    </div>
  );
}
