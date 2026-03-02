import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listRosterTemplates } from "@/lib/actions/rostering";
import { RosterWeekFormClient } from "@/components/domain/rostering/roster-week-form-client";

export const metadata = { title: "New Roster Week - WattleOS" };

export default async function NewRosterWeekPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_ROSTER)) redirect("/admin/rostering");

  const templatesResult = await listRosterTemplates();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>New Roster Week</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Create Roster Week
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Start a new weekly roster, optionally from a template
        </p>
      </div>

      <div className="rounded-xl border border-border p-5" style={{ backgroundColor: "var(--card)" }}>
        <RosterWeekFormClient templates={templatesResult.data ?? []} />
      </div>
    </div>
  );
}
