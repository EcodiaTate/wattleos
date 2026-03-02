// src/app/(app)/parent/recurring-billing/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ParentRecurringBillingLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={2} columns="sm:grid-cols-2" />
      <SkeletonTable rows={4} />
    </div>
  );
}
