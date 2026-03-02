import {
  SkeletonHeader,
  SkeletonCardGrid,
} from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SkeletonHeader />
      <SkeletonCardGrid count={4} columns="sm:grid-cols-2" />
    </div>
  );
}
