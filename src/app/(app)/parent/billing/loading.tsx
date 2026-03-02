// src/app/(app)/parent/billing/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ParentBillingLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonTable rows={6} />
    </div>
  );
}
