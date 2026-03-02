import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listPastoralRecords } from "@/lib/actions/wellbeing";
import { PastoralCategoryBadge } from "@/components/domain/wellbeing/pastoral-category-badge";

export const metadata = { title: "Pastoral Records - WattleOS" };

export default async function PastoralRecordsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_WELLBEING);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WELLBEING);
  const result = await listPastoralRecords({ per_page: 50 });

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>{result.error.message}</p>
      </div>
    );
  }

  const records = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Pastoral Care Records
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            General pastoral log, concern notes, and parent contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/wellbeing" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            ← Dashboard
          </Link>
          {canManage && (
            <Link
              href="/admin/wellbeing/pastoral/new"
              className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              + New Record
            </Link>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center" style={{ backgroundColor: "var(--card)" }}>
          <div className="mx-auto mb-3 text-4xl" style={{ color: "var(--empty-state-icon)" }}>📝</div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No pastoral records</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Pastoral care records and concern notes will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec) => (
            <Link
              key={rec.id}
              href={`/admin/wellbeing/pastoral/${rec.id}`}
              className="card-interactive block rounded-lg border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium" style={{ color: "var(--foreground)" }}>
                    {rec.students.preferred_name || `${rec.students.first_name} ${rec.students.last_name}`}
                  </p>
                  <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {rec.title}
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {rec.description.length > 150 ? rec.description.slice(0, 150) + "..." : rec.description}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(rec.date_of_concern).toLocaleDateString("en-AU")}
                    {rec.recorded_by_user ? ` · ${rec.recorded_by_user.first_name} ${rec.recorded_by_user.last_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <PastoralCategoryBadge category={rec.category} size="sm" showEmoji />
                  {!rec.parent_contacted && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}
                    >
                      Parent not contacted
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
