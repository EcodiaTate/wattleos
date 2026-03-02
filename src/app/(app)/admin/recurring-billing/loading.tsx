// src/app/(app)/admin/recurring-billing/loading.tsx
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function RecurringBillingLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonCardGrid count={3} columns="sm:grid-cols-3" />
      <SkeletonTable rows={8} />
    </div>
  );
}
