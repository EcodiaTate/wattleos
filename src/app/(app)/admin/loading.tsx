// src/app/(app)/admin/loading.tsx

import { SkeletonCardGrid, SkeletonHeader } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={6} columns="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
