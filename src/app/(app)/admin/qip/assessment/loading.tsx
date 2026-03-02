// src/app/(app)/admin/qip/assessment/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function QipAssessmentLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* QA sections */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between gap-3 pl-4">
                <Skeleton className="h-4 w-56" />
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, k) => (
                    <Skeleton key={k} className="h-7 w-20 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
