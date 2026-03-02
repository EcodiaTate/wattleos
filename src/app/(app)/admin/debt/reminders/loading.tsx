// src/app/(app)/admin/debt/reminders/loading.tsx
import {
  SkeletonFilters,
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function DebtRemindersLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonTable rows={6} />
    </div>
  );
}
