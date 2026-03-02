// src/app/(app)/admin/audit-logs/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeader,
  SkeletonPagination,
  SkeletonSearch,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function AuditLogsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <div className="flex flex-wrap gap-3">
        <SkeletonSearch />
        <SkeletonFilters count={4} />
      </div>
      <SkeletonTable rows={15} />
      <SkeletonPagination />
    </div>
  );
}
