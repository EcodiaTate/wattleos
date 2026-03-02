// src/app/(app)/admin/emergency-drills/history/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function DrillHistoryLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={10} />
      <SkeletonPagination />
    </div>
  );
}
