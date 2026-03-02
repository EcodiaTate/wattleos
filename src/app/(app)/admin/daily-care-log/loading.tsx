// src/app/(app)/admin/daily-care-log/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function DailyCareLogLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonFilters count={4} />
      <SkeletonTable rows={10} />
    </div>
  );
}
