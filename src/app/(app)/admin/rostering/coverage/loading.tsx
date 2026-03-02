// src/app/(app)/admin/rostering/coverage/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function CoverageLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={6} />
    </div>
  );
}
