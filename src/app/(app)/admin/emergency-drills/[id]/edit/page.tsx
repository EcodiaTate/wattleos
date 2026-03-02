import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDrill } from "@/lib/actions/emergency-drills";
import { DrillForm } from "@/components/domain/emergency-drills/drill-form";

export const metadata = { title: "Edit Drill - WattleOS" };

export default async function EditDrillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_EMERGENCY_DRILLS)) {
    redirect("/admin/emergency-drills");
  }

  const [drillResult, supabase] = await Promise.all([
    getDrill(id),
    createSupabaseServerClient(),
  ]);

  if (drillResult.error || !drillResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {drillResult.error?.message ?? "Drill not found."}
        </p>
      </div>
    );
  }

  const drill = drillResult.data;

  // Can only edit scheduled drills
  if (drill.status !== "scheduled") {
    redirect(`/admin/emergency-drills/${id}`);
  }

  // Fetch classes and staff
  const [classesResult, staffResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("tenant_users")
      .select("user_id, profiles!inner(first_name, last_name)")
      .eq("tenant_id", context.tenant.id)
      .is("left_at", null),
  ]);

  const classes = (classesResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const staff = (staffResult.data ?? []).map((tu) => {
    const profile = tu.profiles as unknown as {
      first_name: string;
      last_name: string;
    };
    return {
      id: tu.user_id,
      name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    };
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/emergency-drills"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Emergency Drills
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <Link
          href={`/admin/emergency-drills/${id}`}
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Detail
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Edit</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Edit Drill
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Update the drill details before it begins
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <DrillForm drill={drill} classes={classes} staff={staff} />
      </div>
    </div>
  );
}
