// src/app/(app)/comms/loading.tsx

import { SkeletonCardGrid, SkeletonHeader } from "@/components/ui/skeleton";

export default function CommsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2" />
    </div>
  );
}
