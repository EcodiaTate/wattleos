// src/app/(app)/admin/staff/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function StaffLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonTable rows={8} />
    </div>
  );
}
