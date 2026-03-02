import {
  SkeletonHeader,
  SkeletonCardGrid,
} from "@/components/ui/skeleton";

export default function MedicationLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={6} columns="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
