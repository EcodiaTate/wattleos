import {
  SkeletonHeaderWithAction,
  SkeletonFilters,
  SkeletonCardGrid,
} from "@/components/ui/skeleton";

export default function ExcursionsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={5} />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
