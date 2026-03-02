import {
  SkeletonHeader,
  SkeletonCardGrid,
} from "@/components/ui/skeleton";

export default function ParentEventsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
