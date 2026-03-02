// src/app/(app)/admin/rostering/availability/loading.tsx
import {
  Skeleton,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function AvailabilityLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {/* Staff availability grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-0 border-b border-border bg-muted/30">
          <Skeleton className="h-8 m-2 w-20" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 m-2" />
          ))}
        </div>
        {/* Staff rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-0 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2 p-2 border-r border-border/50">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-10 m-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
