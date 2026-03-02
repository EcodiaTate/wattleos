// src/app/(app)/admin/rostering/templates/loading.tsx
import {
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function RosterTemplatesLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonTable rows={5} />
    </div>
  );
}
