// src/app/(app)/admin/enrollment/loading.tsx
import {
  Skeleton,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function EnrollmentLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      {/* Quick link bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}
