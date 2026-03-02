import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listCheckIns } from "@/lib/actions/wellbeing";
import { CHECKIN_STATUS_CONFIG, MOOD_RATING_CONFIG } from "@/lib/constants/wellbeing";

export const metadata = { title: "Wellbeing Check-ins - WattleOS" };

export default async function CheckInsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_WELLBEING);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WELLBEING);
  const result = await listCheckIns({ per_page: 50 });

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>{result.error.message}</p>
      </div>
    );
  }

  const checkIns = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Wellbeing Check-ins
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Scheduled and completed student check-ins
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/wellbeing" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            ← Dashboard
          </Link>
          {canManage && (
            <Link
              href="/admin/wellbeing/check-ins/new"
              className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              + Schedule Check-in
            </Link>
          )}
        </div>
      </div>

      {checkIns.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center" style={{ backgroundColor: "var(--card)" }}>
          <div className="mx-auto mb-3 text-4xl" style={{ color: "var(--empty-state-icon)" }}>📋</div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No check-ins</p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Scheduled student wellbeing check-ins will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkIns.map((ci) => {
            const statusCfg = CHECKIN_STATUS_CONFIG[ci.status];
            const moodCfg = ci.mood_rating ? MOOD_RATING_CONFIG[ci.mood_rating] : null;
            return (
              <Link
                key={ci.id}
                href={`/admin/wellbeing/check-ins/${ci.id}`}
                className="card-interactive block rounded-lg border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>
                      {ci.students.preferred_name || `${ci.students.first_name} ${ci.students.last_name}`}
                    </p>
                    <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(ci.scheduled_for).toLocaleDateString("en-AU", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                      {ci.conducted_by_user ? ` · ${ci.conducted_by_user.first_name} ${ci.conducted_by_user.last_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {moodCfg && (
                      <span title={moodCfg.label} className="text-lg">{moodCfg.emoji}</span>
                    )}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: statusCfg.color, color: "#fff" }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
