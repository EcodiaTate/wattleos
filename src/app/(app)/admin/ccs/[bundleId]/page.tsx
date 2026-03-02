import { redirect, notFound } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getWeeklyBundle,
  listBundleReports,
  getAbsenceTypeCodes,
} from "@/lib/actions/ccs";
import { BundleDetailClient } from "@/components/domain/ccs/bundle-detail-client";

export const metadata = { title: "Bundle Detail - WattleOS" };

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const { bundleId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_CCS_REPORTS) ||
    hasPermission(context, Permissions.MANAGE_CCS_REPORTS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_CCS_REPORTS);

  const [bundleResult, reportsResult, codesResult] = await Promise.all([
    getWeeklyBundle(bundleId),
    listBundleReports(bundleId),
    getAbsenceTypeCodes(),
  ]);

  if (bundleResult.error || !bundleResult.data) notFound();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <BundleDetailClient
        bundle={bundleResult.data}
        reports={reportsResult.data ?? []}
        absenceCodes={codesResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
