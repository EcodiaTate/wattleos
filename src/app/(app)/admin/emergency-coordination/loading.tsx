// src/app/(app)/admin/emergency-coordination/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function EmergencyCoordinationLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      {/* Zone list */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
