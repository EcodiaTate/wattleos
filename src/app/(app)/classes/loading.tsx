// src/app/(app)/classes/loading.tsx

import {
  SkeletonHeaderWithAction,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ClassesLoading() {
  return (
    <div className="space-y-6">
      <SkeletonHeaderWithAction />
      <SkeletonTable rows={6} />
    </div>
  );
}
