// src/app/(app)/admin/debt/plans/loading.tsx
import {
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function DebtPlansLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonTable rows={6} />
    </div>
  );
}
