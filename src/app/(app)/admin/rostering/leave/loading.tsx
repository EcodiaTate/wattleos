// src/app/(app)/admin/rostering/leave/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function LeaveRequestsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={4} />
      <SkeletonTable rows={8} />
    </div>
  );
}
