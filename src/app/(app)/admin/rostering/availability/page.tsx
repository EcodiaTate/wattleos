import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getStaffAvailabilityForDate } from "@/lib/actions/rostering";
import { AvailabilityOverviewClient } from "@/components/domain/rostering/availability-overview-client";

export const metadata = { title: "Staff Availability - WattleOS" };

export default async function AvailabilityOverviewPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_ROSTER)) redirect("/admin/rostering");

  const today = new Date().toISOString().split("T")[0];
  const result = await getStaffAvailabilityForDate(today);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Staff Availability</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Staff Availability
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Today&apos;s availability based on recurring patterns and date overrides
        </p>
      </div>

      <AvailabilityOverviewClient availability={result.data ?? []} />
    </div>
  );
}
