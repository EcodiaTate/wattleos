// src/app/(app)/admin/grant-tracking/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function GrantTrackingLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonTable rows={6} />
    </div>
  );
}
