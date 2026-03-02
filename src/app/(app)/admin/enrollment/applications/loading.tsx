// src/app/(app)/admin/enrollment/applications/loading.tsx
import {
  Skeleton,
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonSearch,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonSearch />
        <SkeletonFilters count={4} />
      </div>
      <SkeletonTable rows={8} />
      <SkeletonPagination />
    </div>
  );
}
