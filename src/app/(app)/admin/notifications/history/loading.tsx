// src/app/(app)/admin/notifications/history/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function NotificationsHistoryLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={10} />
      <SkeletonPagination />
    </div>
  );
}
