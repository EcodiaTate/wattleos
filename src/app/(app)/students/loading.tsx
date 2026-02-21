// src/app/(app)/students/loading.tsx

import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonSearch,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function StudentsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonSearch />
        <SkeletonFilters count={3} />
      </div>
      <SkeletonTable rows={10} />
      <SkeletonPagination />
    </div>
  );
}
