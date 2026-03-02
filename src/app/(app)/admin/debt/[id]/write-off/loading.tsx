// src/app/(app)/admin/debt/[id]/write-off/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DebtWriteOffLoading() {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className={i === 2 ? "h-24 w-full rounded-lg" : "h-10 w-full rounded-lg"} />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-2">
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
