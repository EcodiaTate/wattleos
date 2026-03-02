// src/app/(app)/admin/wellbeing/case-notes/loading.tsx
import {
  SkeletonFeed,
  SkeletonFilters,
  SkeletonHeaderWithAction,
} from "@/components/ui/skeleton";

export default function CaseNotesLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonFeed count={5} />
    </div>
  );
}
