// src/app/(app)/admin/qip/evidence/loading.tsx
import {
  Skeleton,
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonSearch,
} from "@/components/ui/skeleton";

export default function QipEvidenceLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <div className="flex flex-wrap gap-3">
        <SkeletonSearch />
        <SkeletonFilters count={3} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] flex items-center gap-4"
          >
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
