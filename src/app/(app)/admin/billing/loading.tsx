// src/app/(app)/admin/billing/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonFilters,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {/* Stat cards */}
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />
      {/* Filters + table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SkeletonFilters count={4} />
          <Skeleton className="h-9 w-36 rounded-lg ml-auto" />
        </div>
        <SkeletonTable rows={8} />
      </div>
    </div>
  );
}
