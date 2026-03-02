// src/app/(app)/admin/school-photos/staff/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function PhotoStaffLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={6} />
    </div>
  );
}
