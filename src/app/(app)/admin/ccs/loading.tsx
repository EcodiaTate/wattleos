// src/app/(app)/admin/ccs/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function CcsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonTable rows={8} />
    </div>
  );
}
