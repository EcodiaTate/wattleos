// src/app/(app)/admin/school-photos/id-cards/loading.tsx
import {
  Skeleton,
  SkeletonFilters,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function IdCardsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonHeader />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SkeletonFilters count={3} />
      {/* ID card grid */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-3 space-y-2 aspect-[2/3]"
          >
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
