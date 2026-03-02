import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getRosterWeekWithShifts } from "@/lib/actions/rostering";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RosterWeekGridClient } from "@/components/domain/rostering/roster-week-grid-client";

export const metadata = { title: "Roster Week - WattleOS" };

export default async function RosterWeekPage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  const { weekId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ROSTER) ||
    hasPermission(context, Permissions.MANAGE_ROSTER);
  if (!canView) redirect("/admin/rostering");

  const canManage = hasPermission(context, Permissions.MANAGE_ROSTER);
  const supabase = await createSupabaseServerClient();

  const [result, classesResult, staffResult] = await Promise.all([
    getRosterWeekWithShifts(weekId),
    supabase.from("classes").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("tenant_users")
      .select("user_id, profiles:users!inner(first_name, last_name)")
      .eq("tenant_id", context.tenant.id)
      .is("left_at", null),
  ]);

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Roster week not found."}
        </p>
      </div>
    );
  }

  const classes = (classesResult.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  const staff = (staffResult.data ?? []).map((tu: Record<string, unknown>) => {
    const profile = tu.profiles as { first_name: string; last_name: string };
    return {
      id: tu.user_id as string,
      name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    };
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Week of {result.data.week_start_date}</span>
      </div>

      <RosterWeekGridClient
        data={result.data}
        canManage={canManage}
        classes={classes}
        staff={staff}
      />
    </div>
  );
}
