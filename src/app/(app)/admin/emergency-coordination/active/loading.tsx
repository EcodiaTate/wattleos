// src/app/(app)/admin/emergency-coordination/active/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ActiveEmergencyLoading() {
  return (
    <div className="space-y-4">
      {/* Emergency banner placeholder */}
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* Live panel grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Zone grid */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Headcount summary */}
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
