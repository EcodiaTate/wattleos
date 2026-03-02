// src/app/(app)/parent/newsletters/loading.tsx
import {
  SkeletonFeed,
  SkeletonFilters,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function ParentNewslettersLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonFilters count={3} />
      <SkeletonFeed count={4} />
    </div>
  );
}
