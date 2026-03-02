import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listRosterTemplates } from "@/lib/actions/rostering";
import { TemplateListClient } from "@/components/domain/rostering/template-list-client";

export const metadata = { title: "Roster Templates - WattleOS" };

export default async function RosterTemplatesPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ROSTER) ||
    hasPermission(context, Permissions.MANAGE_ROSTER);
  if (!canView) redirect("/admin/rostering");

  const canManage = hasPermission(context, Permissions.MANAGE_ROSTER);
  const result = await listRosterTemplates();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Templates</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Roster Templates
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Reusable weekly shift patterns for quick roster generation
        </p>
      </div>

      <TemplateListClient templates={result.data ?? []} canManage={canManage} />
    </div>
  );
}
