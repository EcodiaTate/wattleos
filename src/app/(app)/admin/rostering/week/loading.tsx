// src/app/(app)/admin/rostering/week/loading.tsx
import {
  Skeleton,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function RosterWeekLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-8 rounded" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-8 rounded" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <SkeletonTable rows={8} />
    </div>
  );
}
