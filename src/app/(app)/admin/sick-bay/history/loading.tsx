// src/app/(app)/admin/sick-bay/history/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function SickBayHistoryLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={10} />
      <SkeletonPagination />
    </div>
  );
}
