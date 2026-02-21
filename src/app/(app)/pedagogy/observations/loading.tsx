// src/app/(app)/pedagogy/observations/loading.tsx

import {
  SkeletonFeed,
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
} from "@/components/ui/skeleton";

export default function ObservationsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonFeed count={6} />
      <SkeletonPagination />
    </div>
  );
}
