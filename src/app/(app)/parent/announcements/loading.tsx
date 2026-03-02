// src/app/(app)/parent/announcements/loading.tsx
import {
  SkeletonFeed,
  SkeletonFilters,
  SkeletonHeader,
} from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonFilters count={3} />
      <SkeletonFeed count={5} />
    </div>
  );
}
