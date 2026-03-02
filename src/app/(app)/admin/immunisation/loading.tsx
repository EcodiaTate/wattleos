// src/app/(app)/admin/immunisation/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ImmunisationLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />
      {/* Overdue AIR checks alert skeleton */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTable rows={8} />
    </div>
  );
}
