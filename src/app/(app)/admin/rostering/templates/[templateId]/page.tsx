import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getRosterTemplateWithShifts } from "@/lib/actions/rostering";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TemplateEditorClient } from "@/components/domain/rostering/template-editor-client";

export const metadata = { title: "Edit Template - WattleOS" };

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_ROSTER)) redirect("/admin/rostering/templates");

  const supabase = await createSupabaseServerClient();

  const [result, classesResult, staffResult] = await Promise.all([
    getRosterTemplateWithShifts(templateId),
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
          {result.error?.message ?? "Template not found."}
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
        <Link href="/admin/rostering/templates" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Templates
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>{result.data.name}</span>
      </div>

      <TemplateEditorClient template={result.data} staff={staff} classes={classes} />
    </div>
  );
}
