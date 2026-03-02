// src/app/(app)/admin/admissions/portal/loading.tsx
import {
  Skeleton,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function AdmissionsPortalLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-4"
        >
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
