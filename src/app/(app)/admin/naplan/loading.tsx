// src/app/(app)/admin/naplan/loading.tsx
import {
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function NaplanLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonTable rows={6} />
    </div>
  );
}
