// src/app/(app)/admin/mqap/alignment/loading.tsx
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function MqapAlignmentLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-3 gap-0 bg-muted/30 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-border/50 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
