import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listDrills } from "@/lib/actions/emergency-drills";
import { DrillListClient } from "@/components/domain/emergency-drills/drill-list-client";

export const metadata = { title: "Drill History - WattleOS" };

export default async function DrillHistoryPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_DRILLS) ||
    hasPermission(context, Permissions.MANAGE_EMERGENCY_DRILLS);
  if (!canView) redirect("/dashboard");

  const result = await listDrills();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load drill history."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/emergency-drills"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Emergency Drills
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>History</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Drill History
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Complete history of all emergency drills
        </p>
      </div>

      <DrillListClient drills={result.data} />
    </div>
  );
}
