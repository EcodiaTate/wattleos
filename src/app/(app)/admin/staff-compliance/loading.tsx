// src/app/(app)/admin/staff-compliance/loading.tsx
import {
  Skeleton,
  SkeletonFilters,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function StaffComplianceLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonFilters count={4} />
      <SkeletonTable rows={8} />
    </div>
  );
}
