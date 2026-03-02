// src/app/(app)/admin/school-photos/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function SchoolPhotosLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      {/* Quick link cards */}
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />
    </div>
  );
}
