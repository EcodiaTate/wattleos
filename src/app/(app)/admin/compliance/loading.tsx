import {
  SkeletonHeaderWithAction,
  SkeletonFilters,
  SkeletonCardGrid,
} from "@/components/ui/skeleton";

export default function ComplianceLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={3} />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
