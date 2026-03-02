// src/app/(app)/admin/learning-plans/[planId]/export/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function LearningPlanExportLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
