import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listZones } from "@/lib/actions/emergency-coordination";
import { ZoneListClient } from "@/components/domain/emergency-coordination/zone-list-client";
import { ZoneForm } from "@/components/domain/emergency-coordination/zone-form";

export const metadata = { title: "Emergency Zones - WattleOS" };

export default async function EmergencyZonesPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_COORDINATION) ||
    hasPermission(context, Permissions.COORDINATE_EMERGENCY) ||
    hasPermission(context, Permissions.ACTIVATE_EMERGENCY);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.ACTIVATE_EMERGENCY);

  const result = await listZones();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load zones."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/emergency-coordination"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Emergency Coordination
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Zones</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Zones & Assembly Points
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Configure zones, assembly points, and warden assignments
          </p>
        </div>
      </div>

      <ZoneListClient zones={result.data} canManage={canManage} />

      {canManage && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="font-semibold text-sm mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Add New Zone
          </h2>
          <ZoneForm />
        </div>
      )}
    </div>
  );
}
