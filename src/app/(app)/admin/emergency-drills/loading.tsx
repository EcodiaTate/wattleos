// src/app/(app)/admin/emergency-drills/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function EmergencyDrillsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonHeader />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonTable rows={6} />
    </div>
  );
}
