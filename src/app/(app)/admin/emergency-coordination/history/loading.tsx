// src/app/(app)/admin/emergency-coordination/history/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function EmergencyHistoryLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={8} />
      <SkeletonPagination />
    </div>
  );
}
