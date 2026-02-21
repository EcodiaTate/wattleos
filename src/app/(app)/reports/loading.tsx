// src/app/(app)/reports/loading.tsx

import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={8} />
    </div>
  );
}
