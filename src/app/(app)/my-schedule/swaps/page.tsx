import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMySwapRequests } from "@/lib/actions/rostering";
import { MySwapsClient } from "@/components/domain/rostering/my-swaps-client";

export const metadata = { title: "Shift Swaps - WattleOS" };

export default async function MySwapsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.REQUEST_SHIFT_SWAP) ||
    hasPermission(context, Permissions.VIEW_ROSTER);
  if (!canView) redirect("/my-schedule");

  const result = await getMySwapRequests();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-schedule" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          My Schedule
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Shift Swaps</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Shift Swaps
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          View and respond to shift swap requests
        </p>
      </div>

      <MySwapsClient requests={result.data ?? []} />
    </div>
  );
}
