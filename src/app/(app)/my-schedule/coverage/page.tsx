import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getAvailableCoverageRequests } from "@/lib/actions/rostering";
import { MyCoverageClient } from "@/components/domain/rostering/my-coverage-client";

export const metadata = { title: "Available Shifts - WattleOS" };

export default async function MyCoveragePage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.ACCEPT_COVERAGE)) redirect("/my-schedule");

  const result = await getAvailableCoverageRequests();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-schedule" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          My Schedule
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Available Shifts</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Available Shifts
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Pick up open shifts that need coverage
        </p>
      </div>

      <MyCoverageClient requests={result.data ?? []} />
    </div>
  );
}
