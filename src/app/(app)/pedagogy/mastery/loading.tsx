// src/app/(app)/pedagogy/mastery/loading.tsx

import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function MasteryLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />

      {/* Student / class picker */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Mastery grid skeleton — area columns with outcome rows */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        {/* Area headers */}
        <div className="flex gap-3 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-28 rounded-full" />
          ))}
        </div>

        {/* Grid rows */}
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-48 shrink-0" />
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 8 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-6 rounded-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
