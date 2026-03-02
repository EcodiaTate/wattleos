// src/app/(app)/admin/learning-plans/transition-statements/loading.tsx
import {
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function TransitionStatementsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonTable rows={6} />
    </div>
  );
}
