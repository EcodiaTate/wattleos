import {
  SkeletonHeaderWithAction,
  SkeletonFilters,
  SkeletonTable,
  SkeletonPagination,
} from "@/components/ui/skeleton";

export default function IncidentsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeaderWithAction />
      <SkeletonFilters count={4} />
      <SkeletonTable rows={8} />
      <SkeletonPagination />
    </div>
  );
}
