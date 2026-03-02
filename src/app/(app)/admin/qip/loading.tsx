// src/app/(app)/admin/qip/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function QipLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {/* Summary stat cards */}
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />
      {/* NQS assessment matrix skeleton */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-8 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
