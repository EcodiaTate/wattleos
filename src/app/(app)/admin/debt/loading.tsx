// src/app/(app)/admin/debt/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonFilters,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function DebtLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={8} />
    </div>
  );
}
