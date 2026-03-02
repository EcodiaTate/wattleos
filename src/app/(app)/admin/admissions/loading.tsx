// src/app/(app)/admin/admissions/loading.tsx
import {
  Skeleton,
  SkeletonHeaderWithAction,
} from "@/components/ui/skeleton";

export default function AdmissionsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      {/* Stage columns skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="rounded-lg border border-border bg-background p-2.5 space-y-2"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
