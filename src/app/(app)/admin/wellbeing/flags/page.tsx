import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listWellbeingFlags } from "@/lib/actions/wellbeing";
import { WellbeingSeverityBadge } from "@/components/domain/wellbeing/wellbeing-severity-badge";
import { WellbeingStatusBadge } from "@/components/domain/wellbeing/wellbeing-status-badge";
import { PastoralCategoryBadge } from "@/components/domain/wellbeing/pastoral-category-badge";

export const metadata = { title: "Wellbeing Flags - WattleOS" };

export default async function WellbeingFlagsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_WELLBEING);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WELLBEING);

  const result = await listWellbeingFlags({ per_page: 50 });

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>{result.error.message}</p>
      </div>
    );
  }

  const flags = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Wellbeing Flags
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Active and historical student concern flags
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/wellbeing" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            ← Dashboard
          </Link>
          {canManage && (
            <Link
              href="/admin/wellbeing/flags/new"
              className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              + Raise Flag
            </Link>
          )}
        </div>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center" style={{ backgroundColor: "var(--card)" }}>
          <div className="mx-auto mb-3 text-4xl" style={{ color: "var(--empty-state-icon)" }}>💚</div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No wellbeing flags</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Flags raised about student concerns will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <Link
              key={flag.id}
              href={`/admin/wellbeing/flags/${flag.id}`}
              className="card-interactive block rounded-lg border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium" style={{ color: "var(--foreground)" }}>
                    {flag.students.preferred_name || `${flag.students.first_name} ${flag.students.last_name}`}
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {flag.summary}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Raised {new Date(flag.created_at).toLocaleDateString("en-AU")}
                    {flag.created_by_user ? ` by ${flag.created_by_user.first_name} ${flag.created_by_user.last_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <WellbeingSeverityBadge severity={flag.severity} size="sm" />
                  <WellbeingStatusBadge status={flag.status} size="sm" />
                  <PastoralCategoryBadge category={flag.category} size="sm" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
