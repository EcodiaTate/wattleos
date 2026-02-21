// src/app/(app)/parent/loading.tsx

import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function ParentLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />

      {/* Child overview cards */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="space-y-2 rounded-lg bg-muted/30 p-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
