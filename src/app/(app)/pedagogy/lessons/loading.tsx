import {
  SkeletonHeaderWithAction,
  SkeletonFilters,
  SkeletonCardGrid,
} from "@/components/ui/skeleton";

export default function LessonsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={4} />
      <SkeletonCardGrid count={8} />
    </div>
  );
}
