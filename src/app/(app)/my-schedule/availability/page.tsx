import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMyAvailability } from "@/lib/actions/rostering";
import { AvailabilityEditorClient } from "@/components/domain/rostering/availability-editor-client";

export const metadata = { title: "My Availability - WattleOS" };

export default async function MyAvailabilityPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.VIEW_ROSTER)) redirect("/my-schedule");

  const result = await getMyAvailability();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-schedule" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          My Schedule
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Availability</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          My Availability
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Set your weekly availability and date-specific overrides
        </p>
      </div>

      <AvailabilityEditorClient availability={result.data ?? []} />
    </div>
  );
}
