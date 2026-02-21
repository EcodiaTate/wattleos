// src/app/(app)/pedagogy/curriculum/loading.tsx

import { Skeleton, SkeletonHeaderWithAction } from "@/components/ui/skeleton";

export default function CurriculumLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />

      {/* Curriculum instance cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
