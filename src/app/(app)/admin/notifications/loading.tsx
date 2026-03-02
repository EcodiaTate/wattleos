// src/app/(app)/admin/notifications/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={8} />
    </div>
  );
}
