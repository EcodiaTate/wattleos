import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listExcursions } from "@/lib/actions/excursions";
import { ExcursionListClient } from "@/components/domain/excursions/excursion-list-client";

export const metadata = { title: "Excursions - WattleOS" };

export default async function ExcursionsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EXCURSIONS) ||
    hasPermission(context, Permissions.MANAGE_EXCURSIONS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_EXCURSIONS);

  const result = await listExcursions();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load excursions."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Excursions
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Off-site visits, risk assessments, and consent tracking (Reg 100-102)
          </p>
        </div>
        {canManage && (
          <Link
            href="/excursions/new"
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            New Excursion
          </Link>
        )}
      </div>

      <ExcursionListClient excursions={result.data} />
    </div>
  );
}
