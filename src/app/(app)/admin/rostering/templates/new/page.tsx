import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { TemplateFormClient } from "@/components/domain/rostering/template-form-client";

export const metadata = { title: "New Template - WattleOS" };

export default async function NewTemplatePage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_ROSTER)) redirect("/admin/rostering/templates");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <Link href="/admin/rostering/templates" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Templates
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>New</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Create Roster Template
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Define a reusable weekly pattern of shifts
        </p>
      </div>

      <div className="rounded-xl border border-border p-5" style={{ backgroundColor: "var(--card)" }}>
        <TemplateFormClient />
      </div>
    </div>
  );
}
