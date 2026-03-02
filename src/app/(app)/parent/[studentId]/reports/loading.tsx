// src/app/(app)/parent/[studentId]/reports/loading.tsx
import {
  SkeletonFeed,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function ChildReportsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonFeed count={4} />
    </div>
  );
}
