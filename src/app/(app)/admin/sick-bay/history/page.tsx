import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listSickBayVisits } from "@/lib/actions/sick-bay";
import { VisitListClient } from "@/components/domain/sick-bay/visit-list-client";

export const metadata = { title: "Visit History - Sick Bay - WattleOS" };

const PER_PAGE = 25;

export default async function SickBayHistoryPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_SICK_BAY) ||
    hasPermission(context, Permissions.MANAGE_SICK_BAY);
  if (!canView) redirect("/dashboard");

  const result = await listSickBayVisits({
    page: 1,
    perPage: PER_PAGE,
    date_from: null,
    date_to: null,
    search: null,
  });

  if (result.error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Link
          href="/admin/sick-bay"
          className="text-sm"
          style={{ color: "var(--primary)" }}
        >
          ← Back to Sick Bay
        </Link>
        <p style={{ color: "var(--destructive)" }}>
          {result.error.message ?? "Failed to load visit history."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/sick-bay"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Sick Bay
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Visit History</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Visit History
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          All sick bay visits - search and filter by status or type
        </p>
      </div>

      <VisitListClient
        initialVisits={result.data}
        totalCount={result.pagination.total}
        page={result.pagination.page}
        perPage={PER_PAGE}
      />
    </div>
  );
}
