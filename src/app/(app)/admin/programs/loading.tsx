// src/app/(app)/programs/loading.tsx

import {
  SkeletonCardGrid,
  SkeletonFilters,
  SkeletonHeaderWithAction,
} from "@/components/ui/skeleton";

export default function ProgramsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonCardGrid count={6} columns="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
